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
        topicName: 'projects/YOUR_PROJECT_ID/topics/gmail-updates', // Pub/Sub topic
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
  try {
    const message = Buffer.from(req.body.message.data, 'base64').toString();
    const data = JSON.parse(message);

    const { emailAddress, historyId } = data;
    console.log("New Gmail notification for:", emailAddress, "history:", historyId);

    // Find user by emailAddress
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', emailAddress)
      .single();

    if (!user) {
      console.warn("No user found for email:", emailAddress);
      return res.sendStatus(200);
    }

    // Fetch new emails since last historyId
    const auth = await getGoogleAuth(user.id);
    const gmail = google.gmail({ version: 'v1', auth });

    const history = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: user.last_history_id,
      historyTypes: ['messageAdded'],
    });

    const newMessages = history.data.history?.flatMap(h => h.messages || []) || [];

    // Update user’s last_history_id
    await supabase
      .from('users')
      .update({ last_history_id: historyId })
      .eq('id', user.id);

    // Fetch + classify only the new messages
    for (const msg of newMessages) {
      const msgDetail = await gmail.users.messages.get(
        {
          userId: 'me',
          id: msg.id,
          
        }
      )
      const headers = msgDetail.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const snippet = msgDetail.data.snippet || '';

      const classification = await classifyEmail(subject, from, ["Applied Jobs", "Rejected Jobs", "Next Steps", "OTP Emails", "New Job Matches"], snippet);

      // Store in DB
      await supabase.from('emails').insert({
        user_id: user.id,
        gmail_id: msg.id,
        subject,
        sender: from,
        snippet,
        classification,
      });
    }

    res.sendStatus(200);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
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