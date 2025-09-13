// supabase/functions/notify-upcoming-blocks/index.ts

// import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// // Supabase client
// const supabase = createClient(
//   Deno.env.get("SUPABASE_URL")!,
//   Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
// );

// Deno.serve(async () => {
//   const now = new Date();
//   const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);

//   // Blocks jo 10 min me start hone wale hain aur notified = false
//   const { data: blocks, error } = await supabase
//     .from("study_blocks")
//     .select("id, user_id, start_time, notified")
//     .eq("notified", false)
//     .gte("start_time", now.toISOString())
//     .lte("start_time", tenMinutesLater.toISOString());

//   if (error) {
//     console.error(error);
//     return new Response("DB error", { status: 500 });
//   }

//   if (!blocks || blocks.length === 0) {
//     return new Response("No notifications");
//   }

//   for (const block of blocks) {
//     const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(block.user_id);
//     if (userError || !user?.email) continue;

//     // ✅ Call your Next.js API route instead of sending email directly
//     await fetch(`${Deno.env.get("NEXT_PUBLIC_APP_URL")}/api/send-email`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "x-cron-secret": Deno.env.get("CRON_SECRET")!, // security key
//       },
//       body: JSON.stringify({
//         to: user.email,
//         subject: "⏰ Your study block starts in 10 minutes",
//         html: `<p>Hello! Your study block starts at ${block.start_time}. Stay focused!</p>`
//       }),
//     });

//     // Mark as notified
//     await supabase.from("study_blocks").update({ notified: true }).eq("id", block.id);
//   }

//   return new Response("Emails triggered");
// });





// Import Supabase client from CDN
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import Resend from CDN
// @deno-types="https://esm.sh/v135/resend@3.6.0/dist/index.d.ts"
import { Resend } from "https://esm.sh/resend@3.6.0";

// Get environment variables with validation
function getRequiredEnvVar(name: string): string {
  // @ts-ignore - Deno.env is available in Supabase Edge Functions
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Initialize Supabase client
const supabaseUrl = getRequiredEnvVar("SUPABASE_URL");
const supabaseKey = getRequiredEnvVar("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = getRequiredEnvVar("RESEND_API_KEY");

console.log("Initializing Supabase client with URL:", 
  supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NOT SET');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Initialize Resend
const resend = new Resend(RESEND_API_KEY);

// Helper function to convert to UTC
function toUTCString(date: Date): string {
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();
}

// Helper function to format date in user's local timezone
function formatLocalDateTime(dateString: string): { formatted: string; time: string; date: string } {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  const formatted = date.toLocaleString('en-IN', options);
  const time = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  
  return { formatted, time, date: dateStr };
}

Deno.serve(async (req) => {
  try {
    const now = new Date();
    const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);

    console.log(`[${new Date().toISOString()}] Checking for blocks between ${now.toISOString()} and ${tenMinutesLater.toISOString()}`);

    // Get blocks starting within the next 10 minutes that haven't been notified yet
    const startTime = toUTCString(now);
    const endTime = toUTCString(tenMinutesLater);
    
    console.log(`Looking for blocks between: ${startTime} and ${endTime}`);
    
    const { data: blocks, error } = await supabase
      .from("study_blocks")
      .select("id, user_id, start_time, notified")
      .eq("notified", false)
      .gte("start_time", startTime)
      .lte("start_time", endTime);
      
    console.log(`Found ${blocks?.length || 0} blocks in query`);

    if (error) {
      console.error("Database error:", error);
      return new Response(JSON.stringify({ error: "Database error", details: error }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log(`Found ${blocks?.length || 0} blocks to notify`);
    
    if (!blocks || blocks.length === 0) {
      return new Response(JSON.stringify({ message: "No notifications due" }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const results = [];
    
    for (const block of blocks) {
      try {
        console.log(`Processing block ${block.id} for user ${block.user_id}`);
        
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(block.user_id);
        
        if (userError || !user) {
          console.error(`Error fetching user ${block.user_id}:`, userError);
          results.push({ blockId: block.id, status: "error", message: "User not found", error: userError });
          continue;
        }

        if (!user.email) {
          console.error(`User ${block.user_id} has no email`);
          results.push({ blockId: block.id, status: "error", message: "User has no email" });
          continue;
        }

        console.log(`Sending email to ${user.email} for block at ${block.start_time}`);

        // Send email using Resend SDK
        const { data: emailResponse, error: emailError } = await resend.emails.send({
          from: 'Study Blocks <onboarding@resend.dev>',
          to: ['amanraj301995@gmail.com'],
          subject: `Your study block is starting soon ⏰ (${block.id})`,
          html: `
            <h2>⏰ Study Block Reminder</h2>
            <p>Hello,</p>
            <p>Your scheduled study block is about to begin:</p>
            <p><strong>Start Time:</strong> ${formatLocalDateTime(block.start_time).time} (${Intl.DateTimeFormat().resolvedOptions().timeZone})</p>
            <p><strong>Date:</strong> ${formatLocalDateTime(block.start_time).date}</p>
            <p>Stay focused and productive!</p>
            <hr>
            <p><small>This is an automated message. Please do not reply.</small></p>
          `,
          text: `Your study block is starting soon (${block.id})

Start Time: ${formatLocalDateTime(block.start_time).time} (${Intl.DateTimeFormat().resolvedOptions().timeZone})
Date: ${formatLocalDateTime(block.start_time).date}

Stay focused and productive!`
        });

        if (emailError) {
          throw new Error(`Resend API Error: ${JSON.stringify(emailError)}`);
        }

        console.log(`✅ Email sent successfully! Email ID:`, emailResponse?.id);

        // Mark as notified
        const { error: updateError } = await supabase
          .from("study_blocks")
          .update({ notified: true })
          .eq("id", block.id);

        if (updateError) {
          throw new Error(`Failed to update block status: ${updateError.message}`);
        }

        results.push({ blockId: block.id, status: "success", email: user.email, emailId: emailResponse?.id });
        
      } catch (error) {
        console.error(`Error processing block ${block.id}:`, error);
        results.push({ 
          blockId: block.id, 
          status: "error", 
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : String(error)
      }), 
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});