import { inngest } from "../inngest/client.js";

export const someController = async (req, res) => {
  // send an event to trigger background function
  await inngest.send({
    name: "test/hello.world",
    data: { email: req.user.email },
  });

  return res.json({ success: true, message: "Job queued!" });
};