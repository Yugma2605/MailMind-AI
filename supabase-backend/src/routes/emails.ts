import { Router, Request, Response } from 'express';
import { supabase } from '../supabase/config.js';
import { requireAuth } from '../utils/auth.js';
import { getGoogleAuth } from '../google/googleAuth.js';
import { google } from 'googleapis';
import classifyEmail from '../utils/classifyEmail.js';

const router = Router();

router.get("/gmail/recent", requireAuth(), async (req, res) => {
  try {
    const user_id = (req as any).user_id;

    const auth = await getGoogleAuth(user_id);
    const gmail = google.gmail({ version: "v1", auth });

    // Example: list last 5 messages
    const { data } = await gmail.users.messages.list({
      userId: "me",
      maxResults: 5,
    });

    res.json({ messages: data });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/gmail/watch', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user_id;
    const auth = await getGoogleAuth(user_id);
    const gmail = google.gmail({ version: 'v1', auth });

    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'], // watch only inbox
        topicName: `projects/${process.env.GMAIL_PROJECT_ID}/topics/gmail-updates`, // Pub/Sub topic
      },
    });

    // Store the returned historyId in DB for this user
    await supabase.from('gmail_watch').upsert({
      user_id,
      history_id: response.data.historyId,
    });

    res.json({ success: true, watchResponse: response.data });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/gmail/notifications', async (req: Request, res: Response) => {
  console.log("Incoming Gmail notification...");
  try {
    if (!req.body?.message?.data) {
      console.warn("No message data in request");
      return res.sendStatus(400);
    }

    const messageStr = Buffer.from(req.body.message.data, 'base64').toString();
    console.log("Decoded message:", messageStr);

    let data: any;
    try {
      data = JSON.parse(messageStr);
    } catch (err) {
      console.error("Failed to parse JSON from message:", err);
      return res.sendStatus(400);
    }

    const { emailAddress, historyId } = data;
    console.log("Notification for:", emailAddress, "historyId:", historyId);

    // Fetch user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', emailAddress)
      .single();

    if (error) {
      console.error("Supabase error fetching user:", error);
      return res.sendStatus(500);
    }
    if (!user) {
      console.warn("No user found for email:", emailAddress);
      return res.sendStatus(200); // Not an error
    }

    console.log("User found:", user);

    // If first time, just set last_history_id
    if (!user.last_history_id) {
      console.log("First notification for this user, setting last_history_id");
      await supabase.from('users')
        .update({ last_history_id: historyId })
        .eq('id', user.id);
      return res.sendStatus(200);
    }

    console.log("Fetching Gmail history...");

    const auth = await getGoogleAuth(user.id);
    const gmail = google.gmail({ version: 'v1', auth });

    let history;
    try {
      history = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: user.last_history_id,
        historyTypes: ['messageAdded'],
      });
    } catch (err) {
      console.error("Error fetching Gmail history:", err);
      // Maybe historyId expired → reset?
      return res.sendStatus(500);
    }

    const newMessages = history.data.history?.flatMap(h => h.messages || []) || [];
    console.log("New messages found:", newMessages.length);

    // Update last_history_id immediately
    await supabase
      .from('users')
      .update({ last_history_id: historyId })
      .eq('id', user.id);

    // Process each message
    for (const msg of newMessages) {
      console.log("Processing message ID:", msg.id);

      let msgDetail;
      try {
        msgDetail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full', // Use 'full' to get snippet
        });
      } catch (err) {
        console.error("Error fetching message details:", err);
        continue; // Skip this message
      }

      const headers = msgDetail.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const snippet = msgDetail.data.snippet || '';
      const { data: categoriesData, error: catError } = await supabase
        .from('categories')
        .select('name, description')
        .eq('user_id', user.id);

      if (catError || !categoriesData) {
        console.error("Failed to fetch categories:", catError);
        categoriesData = [];
      }

      let classification: any;
      try {
        classification = await classifyEmail(
          subject,
          from,
          categoriesData,
          snippet
        );
        console.log("Classification result:", classification);
      } catch (err) {
        console.error("Classification failed for message ID:", msg.id, err);
        classification = { error: "classification_failed" };
      }

      try {
        await supabase.from('emails').insert({
          user_id: user.id,
          gmail_id: msg.id,
          subject,
          sender: from,
          snippet,
          classification: JSON.stringify(classification),
        });
        console.log("Email inserted:", msg.id);
      } catch (err) {
        console.error("Failed to insert email ID:", msg.id, err);
      }
    }

    console.log("Finished processing Gmail notification");
    res.sendStatus(200);

  } catch (err: any) {
    console.error("Unexpected error in /gmail/notifications:", err);
    res.status(500).json({ error: err.message });
  }
});


router.post('/classify-emails', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user_id;

    const { data: categoriesData, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user_id);
    
    if (catError) throw catError;

    const categories = categoriesData.map((c: any) => c.name);
    console.log(categories);
    const auth = await getGoogleAuth(user_id);
    const gmail = google.gmail({ version: 'v1', auth });
    const { data: messagesData } = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 15,
    });

    const messages = messagesData.messages || [];
    console.log("Messages found : ",messages);
    // 3️⃣ Fetch each email's details
    const detailedEmails = await Promise.all(
      messages.map(async (msg: any) => {
        const msgDetail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

        const headers = msgDetail.data.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const snippet = msgDetail.data.snippet || '';

        return { subject, from, snippet };
      })
    );

    const classifiedEmails = await Promise.all(
      detailedEmails.map(async (email) => {
        const classification = await classifyEmail(
          email.subject,
          email.from,
          categories,
          email.snippet
        );
        return { ...email, classification };
      })
    );

    res.json({ classifiedEmails });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;