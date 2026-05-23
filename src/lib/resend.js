import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
  try {
    console.log("attempting to send email to:", to);

    const { data, error } = await Promise.race([
      resend.emails.send({
        from: "FinX AI <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Email request timed out after 10s")), 10000)
      ),
    ]);

    if (error) {
      console.error("Resend error:", error);
      return;
    }

    console.log("Email sent successfully:", data);
    return data;

  } catch (err) {
    console.error("sendEmail failed:", err.message);
  }
};

// FinX AI <noreply@finxai.com>