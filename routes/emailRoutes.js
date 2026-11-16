
import express from "express";
import Email from "../models/Email.js";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";
import transporter from "../email.js";

const router = express.Router();

// SEND EMAIL
router.post("/send", authMiddleware, async (req, res) => {
  try {
    const { receiver, subject, message } = req.body;

    if (!receiver || !subject || !message) {
      return res.status(400).json({
        message: "Receiver, subject and message are required",
      });
    }

    const receiverEmail = receiver.toLowerCase().trim();

    const receiverUser = await User.findOne({
      email: receiverEmail,
    });

    if (!receiverUser) {
      return res.status(404).json({
        message: "Receiver account not found",
      });
    }

    const senderUser = await User.findById(req.userId);

    if (!senderUser) {
      return res.status(404).json({
        message: "Sender account not found",
      });
    }

    // SEND REAL EMAIL THROUGH GMAIL
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: receiverEmail,
      subject,
      text: message,
    });

    // SAVE EMAIL IN MONGODB
    const email = await Email.create({
      sender: req.userId,
      receiver: receiverUser._id,
      subject,
      message,
    });

    // REAL-TIME NOTIFICATION
    const io = req.app.get("io");

    if (io) {
      io.to(receiverUser._id.toString()).emit("newEmail", {
        message: "You have received a new email",
        subject: email.subject,
        emailId: email._id,
      });
    }

    return res.status(201).json({
      message: "Email sent successfully through Gmail",
      email,
    });

  } catch (error) {
    console.error("Send email error:", error.message);

    return res.status(500).json({
      message: "Could not send email. Please check Gmail configuration.",
    });
  }
});

// DELETE EMAIL (INBOX AND SENT)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const email = await Email.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [
          { sender: req.userId },
          { receiver: req.userId },
        ],
        deletedBy: { $ne: req.userId },
      },
      {
        $addToSet: { deletedBy: req.userId },
      },
      { new: true }
    );

    if (!email) {
      return res.status(404).json({
        message: "Email not found or already deleted",
      });
    }

    return res.json({
      message: "Email deleted successfully",
    });

  } catch (error) {
    console.error("Delete email error:", error.message);

    return res.status(500).json({
      message: "Could not delete email",
    });
  }
});

// INBOX
router.get("/inbox", authMiddleware, async (req, res) => {
  try {
    const emails = await Email.find({
      receiver: req.userId,
      deletedBy: { $ne: req.userId },
    })
      .populate("sender", "email")
      .sort({ createdAt: -1 });

    res.json({ emails });

  } catch (error) {
    console.error("Inbox error:", error.message);

    res.status(500).json({
      message: "Could not load inbox",
    });
  }
});

// SENT EMAILS
router.get("/sent", authMiddleware, async (req, res) => {
  try {
    const emails = await Email.find({
      sender: req.userId,
      deletedBy: { $ne: req.userId },
    })
      .populate("receiver", "email")
      .sort({ createdAt: -1 });

    res.json({ emails });

  } catch (error) {
    console.error("Sent emails error:", error.message);

    res.status(500).json({
      message: "Could not load sent emails",
    });
  }
});

// MARK EMAIL AS READ
router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const email = await Email.findOneAndUpdate(
      {
        _id: req.params.id,
        receiver: req.userId,
        deletedBy: { $ne: req.userId },
      },
      { isRead: true },
      { new: true }
    );

    if (!email) {
      return res.status(404).json({
        message: "Email not found",
      });
    }

    res.json({
      message: "Email marked as read",
      email,
    });

  } catch (error) {
    console.error("Mark read error:", error.message);

    res.status(500).json({
      message: "Could not update email",
    });
  }
});

export default router;
