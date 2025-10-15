import { Metadata } from "next";
import { Inter, Poppins, Lexend } from "next/font/google";
import "./globals.css";
import "../styles/fonts.css";
import { Providers } from "./providers";
import AuthWrapper from "./components/AuthWrapper";
import { TranslationProvider } from "./providers/TranslationContext";
import { LocaleProvider } from "./providers/LocaleContext";
import LoadingBar from "@root/components/ui/LoadingBar";

const inter = Inter({ subsets: ["latin"] });

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-lexend",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tixae Interviewer",
  description:
    "Tixae Interviewer is a platform for conducting interviews with AI and evaluating candidates for jobs, universities, and more.",
  keywords: [
    "tixae",
    "interviewer",
    "ai",
    "interview",
    "assessment",
    "evaluation",
    "recruitment",
    "hiring",
    "job",
    "job interview",
    "job assessment",
    "job evaluation",
    "job recruitment",
    "job hiring",
    "university",
    "university interview",
    "university assessment",
    "university evaluation",
    "university recruitment",
    "university hiring",
    "university job",
  ],
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
    other: {
      rel: "apple-touch-icon-precomposed",
      url: "/favicon.png",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function (w, d, s, l, i) {
            w[l] = w[l] || [];
            w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
            var f = d.getElementsByTagName(s)[0],
              j = d.createElement(s),
              dl = l != "dataLayer" ? "&l=" + l : "";
            j.async = true;
            j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
            f.parentNode.insertBefore(j, f);
          })(window, document, "script", "dataLayer", "GTM-PWC3N2JP");
        `,
          }}
        />
      </head>
      <body
        className={`${inter.className} ${poppins.variable} ${lexend.variable} text-base`}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PWC3N2JP"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <LocaleProvider>
          <TranslationProvider>
            <Providers>
              <LoadingBar />
              <AuthWrapper>{children}</AuthWrapper>
            </Providers>
          </TranslationProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
