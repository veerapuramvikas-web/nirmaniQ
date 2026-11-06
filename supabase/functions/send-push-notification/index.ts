// Supabase Edge Function: send-push-notification
// Deploy with: supabase functions deploy send-push-notification --no-verify-jwt

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import webpush from 'https://esm.sh/web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Environment Secrets
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@nirmaniq.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const payload = await req.json();

    // ─────────────────────────────────────────────────────────────────────────
    // 1. INLINE REPLY HANDLER
    // Called by Service Worker when user submits reply directly from OS notification
    // ─────────────────────────────────────────────────────────────────────────
    if (payload.action === 'inline_reply') {
      const authHeader = req.headers.get('Authorization');
      let senderUserId = payload.sender_user_id;

      // If JWT provided, verify token
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          senderUserId = user.id;
        }
      }

      const entityId = payload.conversation_id || payload.related_entity_id;
      const content = (payload.content || '').trim();

      if (!content || !entityId) {
        return new Response(
          JSON.stringify({ error: 'Missing content or entity ID for inline reply' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if target is an issue
      const { data: issue } = await supabase
        .from('issues')
        .select('id, resolution_notes, title')
        .eq('id', entityId)
        .maybeSingle();

      if (issue) {
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const appendedNote = issue.resolution_notes
          ? `${issue.resolution_notes}\n[Quick Reply ${timestamp}]: ${content}`
          : `[Quick Reply ${timestamp}]: ${content}`;

        await supabase
          .from('issues')
          .update({ resolution_notes: appendedNote, updated_at: new Date().toISOString() })
          .eq('id', entityId);

        // Also insert into issue_comments if table exists
        await supabase
          .from('issue_comments')
          .insert({
            issue_id: entityId,
            user_id: senderUserId || '00000000-0000-0000-0000-000000000000',
            content: content,
          })
          .catch(() => {}); // Gracefully ignore if optional table missing
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Inline reply saved successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. DISPATCH PUSH NOTIFICATION
    // ─────────────────────────────────────────────────────────────────────────
    const { receiver_id, title, message, type = 'general', url = '/', related_entity_id } = payload;

    if (!receiver_id || !title) {
      return new Response(
        JSON.stringify({ error: 'Missing receiver_id or title' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query active device endpoints for target receiver
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh_key, auth_key')
      .eq('user_id', receiver_id);

    if (subError) {
      throw subError;
    }

    // Query unread count for App Icon Badge
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', receiver_id)
      .eq('is_read', false);

    const badgeCount = (unreadCount !== null && unreadCount !== undefined) ? Math.max(1, unreadCount) : 1;

    const pushPayload = JSON.stringify({
      title: title || 'NirmaniQ Alert',
      body: message || 'You have an update in NirmaniQ.',
      type,
      url,
      conversationId: related_entity_id,
      badgeCount,
      unreadCount: badgeCount,
      timestamp: Date.now(),
    });

    const results = [];
    const expiredSubIds: string[] = [];

    for (const sub of (subscriptions || [])) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
          },
        };

        const res = await webpush.sendNotification(pushSubscription, pushPayload, {
          TTL: 86400,
          urgency: 'high',
        });
        results.push({ endpoint: sub.endpoint, status: res.statusCode });
      } catch (err: any) {
        // HTTP 404 or 410 indicates subscription has expired or unsubscribed
        if (err.statusCode === 404 || err.statusCode === 410) {
          expiredSubIds.push(sub.id);
        }
        results.push({ endpoint: sub.endpoint, error: err.message, status: err.statusCode });
      }
    }

    // Clean up expired subscriptions automatically
    if (expiredSubIds.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', expiredSubIds);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: results.length,
        expired_purged: expiredSubIds.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
