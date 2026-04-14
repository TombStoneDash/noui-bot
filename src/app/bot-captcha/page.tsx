import type { Metadata } from "next";
import { BotCaptcha } from "./BotCaptchaClient";

export const metadata: Metadata = {
  title: "Bot CAPTCHA — Prove You're a Bot | noui.bot",
  description:
    "The internet's first CAPTCHA only bots can solve. 4 challenges. Can you pass? Probably not.",
  openGraph: {
    title: "Bot CAPTCHA — Can You Prove You're a Bot?",
    description:
      "The internet wasn't built for agents. This CAPTCHA wasn't built for you. Try it.",
    url: "https://noui.bot/bot-captcha",
    siteName: "noui.bot",
    type: "website",
    images: [{ url: "/og/bot-captcha", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bot CAPTCHA — Can You Prove You're a Bot?",
    description: "4 challenges only machines can pass. What's your score?",
    images: ["/og/bot-captcha"],
    creator: "@forthebots",
  },
};

export default function BotCaptchaPage() {
  return <BotCaptcha />;
}
