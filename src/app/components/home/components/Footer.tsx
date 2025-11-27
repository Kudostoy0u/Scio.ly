"use client";
import Image from "next/image";
import Link from "next/link";
import { FaDiscord, FaEnvelope, FaGithub, FaInstagram } from "react-icons/fa";

interface FooterProps {
  darkMode: boolean;
}

const socialLinks = [
  { href: "https://discord.gg/hXSkrD33gu", icon: FaDiscord, label: "Discord" },
  { href: "https://www.instagram.com/Scio.ly", icon: FaInstagram, label: "Instagram" },
  { href: "https://github.com/NapervilleASK/Scio.ly-Help", icon: FaGithub, label: "GitHub" },
  { href: "mailto:team.scio.ly@gmail.com", icon: FaEnvelope, label: "Email" },
];

const quickLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/about", label: "About" },
];

const otherToolsLinks = [
  { href: "/bookmarks", label: "Bookmarks" },
  { href: "/docs", label: "Documentation" },
  { href: "/reports", label: "Reports" },
];

const legalLinks = [
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/contact", label: "Contact" },
];

function FooterLinkList({
  links,
  darkMode,
}: {
  links: Array<{ href: string; label: string }>;
  darkMode: boolean;
}) {
  const linkClasses = darkMode
    ? "text-gray-400 hover:text-white"
    : "text-gray-600 hover:text-gray-900";
  return (
    <ul className="space-y-2">
      {links.map((link) => (
        <li key={link.href}>
          <Link href={link.href} className={linkClasses}>
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FooterSection({
  title,
  links,
  darkMode,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
  darkMode: boolean;
}) {
  return (
    <div>
      <h3 className={`font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>{title}</h3>
      <FooterLinkList links={links} darkMode={darkMode} />
    </div>
  );
}

export function Footer({ darkMode }: FooterProps) {
  const linkClasses = darkMode
    ? "text-gray-400 hover:text-white"
    : "text-gray-600 hover:text-gray-900";

  return (
    <footer
      className={`${darkMode ? "bg-gray-900 border-gray-800" : "bg-gray-100 border-gray-200"} border-t`}
    >
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div>
            <Link href="/" className="flex items-center">
              <Image
                src="https://res.cloudinary.com/djilwi4nh/image/upload/v1760504427/site-logo_lzc8t0.png"
                alt="Scio.ly Logo"
                width={32}
                height={32}
                className="mr-2"
              />
              <span className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                Scio.ly
              </span>
            </Link>
            <p className={`mt-4 text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              Making Science Olympiad practice accessible to everyone.
            </p>
          </div>
          <FooterSection title="Quick Links" links={quickLinks} darkMode={darkMode} />
          <FooterSection title="Other Tools" links={otherToolsLinks} darkMode={darkMode} />
          <FooterSection title="Legal" links={legalLinks} darkMode={darkMode} />
          <div>
            <h3 className={`font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
              Connect
            </h3>
            <div className="flex space-x-4">
              {socialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target={social.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel={social.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                    className={linkClasses}
                    aria-label={social.label}
                  >
                    <IconComponent className="w-6 h-6" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
        <div
          className={`mt-8 pt-8 border-t text-sm ${darkMode ? "border-gray-800 text-gray-400" : "border-gray-200 text-gray-600"} flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0`}
        >
          <p>© {new Date().getFullYear()} Scio.ly. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
