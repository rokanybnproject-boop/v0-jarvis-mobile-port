import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Cairo } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { LocaleProvider } from "@/components/jarvis/locale-provider"
import "./globals.css"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "JARVIS — هاتفك، لكن أذكى",
  description:
    "دماغ ذكاء اصطناعي متعدد الوكلاء يتحكم في هاتف Android عبر Termux. أحضر مفتاح API الخاص بك.",
  generator: "v0.app",
  applicationName: "Jarvis",
  appleWebApp: {
    capable: true,
    title: "Jarvis",
    statusBarStyle: "black-translucent",
  },
}

export const viewport: Viewport = {
  themeColor: "#0a1620",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${cairo.variable} bg-background`}
    >
      <body className="font-sans antialiased min-h-dvh">
        <LocaleProvider>
          {children}
          <Toaster theme="dark" position="top-center" />
          {process.env.NODE_ENV === "production" && <Analytics />}
        </LocaleProvider>
      </body>
    </html>
  )
}
