import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { to, subject, html } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // Gmail App Password
      },
    });

    await transporter.sendMail({
      from: `"Study Blocks" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Email error:", err);
    res.status(500).json({ error: err.message });
  }
}
