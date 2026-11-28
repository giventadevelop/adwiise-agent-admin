"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Facebook, Twitter, Linkedin, Youtube, ArrowUp, Mail, Phone, MapPin, Globe } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { FooterContactProps } from "@/lib/footerContactTypes";

const DEFAULT_CONTACT: FooterContactProps = {
  formattedAddress: "123 Charity Lane\nHope City, HC 12345\nUnited States",
  phoneNumber: "+1 (555) 123-4567",
  email: "contact@charityorg.com",
  websiteUrl: null,
  description: null,
};

function formatTelHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? `tel:${digits}` : `tel:${digits.replace(/\D/g, "")}`;
}

function AddressLines({ address }: { address: string }) {
  const lines = address
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^apt\.?\s*7$/i.test(line));
  return (
    <>
      {lines.map((line, index) => (
        <React.Fragment key={`${line}-${index}`}>
          {line}
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
}

// Back-to-top button component with comprehensive styling
const BackToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed bottom-6 right-6 z-50
        w-14 h-14 min-w-[56px] min-h-[56px]
        bg-blue-600 hover:bg-blue-700 active:bg-blue-800
        text-white rounded-full
        flex items-center justify-center
        shadow-xl hover:shadow-2xl
        font-inter font-medium
        focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
        transition-all duration-300 ease-in-out
        hover:scale-110 active:scale-95
        touch-manipulation
        ${isVisible ? 'translate-y-0 opacity-100 visible' : 'translate-y-4 opacity-0 invisible'}
      `}
      aria-label="Back to top"
    >
      <ArrowUp
        className="w-6 h-6 transition-transform duration-300 group-hover:-translate-y-0.5"
        strokeWidth={2.5}
        aria-hidden="true"
      />
    </button>
  );
};

const Footer = ({ contact }: { contact?: Partial<FooterContactProps> }) => {
  const pathname = usePathname();
  const onHub = pathname === "/" || pathname.startsWith("/admin");
  const usePlaceholderContact = contact === undefined;
  const resolved: FooterContactProps = {
    formattedAddress: usePlaceholderContact
      ? DEFAULT_CONTACT.formattedAddress
      : (contact.formattedAddress ?? null),
    phoneNumber: usePlaceholderContact
      ? DEFAULT_CONTACT.phoneNumber
      : (contact.phoneNumber ?? null),
    email: usePlaceholderContact ? DEFAULT_CONTACT.email : (contact.email ?? null),
    websiteUrl: usePlaceholderContact
      ? DEFAULT_CONTACT.websiteUrl
      : (contact.websiteUrl ?? null),
    description: usePlaceholderContact
      ? DEFAULT_CONTACT.description
      : (contact.description ?? null),
  };
  const footerEmail =
    resolved.email?.toLowerCase() === "giventauser@gmail.com"
      ? "sales@giventa.com"
      : resolved.email;

  return (
    <footer className={`${onHub ? "footer-on-hub bg-[#A3124F]" : "bg-gray-900"} text-gray-300 footer-edge-to-edge mt-20`} data-testid="main-footer" role="contentinfo">
      {/* Main Footer Content */}
      <div className={`w-full ${onHub ? "bg-[#A3124F]" : "bg-gray-900"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">

            {/* Column 1: Logos and Social Media */}
            <div className="lg:col-span-1">
              <div className="flex flex-col items-start gap-3 mb-6">
                <Link href="/" className="inline-flex items-center bg-white rounded-lg px-3 py-2">
                  <Image
                    src="/images/adwiise-agent/adwiise-agent-logo.svg"
                    alt="Adwiise Agent"
                    width={220}
                    height={40}
                    priority
                    unoptimized
                    className="h-9 w-auto"
                  />
                </Link>
                <a
                  href="https://www.giventa.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-white rounded-lg px-3 py-2"
                >
                  <Image
                    src="/images/adwiise-agent/giventa-logo.png"
                    alt="Giventa"
                    width={160}
                    height={40}
                    className="h-9 w-auto"
                  />
                </a>
              </div>

              <div className="mb-6">
                <p className="text-white font-inter font-medium text-sm mb-4">Follow our journey</p>
                <ul className="flex space-x-4">
                  <li>
                    <a
                      href="#"
                      className="
                        flex items-center justify-center w-10 h-10
                        text-gray-400 hover:text-white
                        bg-gray-800 hover:bg-blue-600
                        rounded-lg transition-all duration-300
                        hover:scale-110 active:scale-95
                        focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-gray-900
                      "
                      aria-label="Follow us on Facebook"
                    >
                      <Facebook size={18} strokeWidth={2} />
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="
                        flex items-center justify-center w-10 h-10
                        text-gray-400 hover:text-white
                        bg-gray-800 hover:bg-blue-400
                        rounded-lg transition-all duration-300
                        hover:scale-110 active:scale-95
                        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900
                      "
                      aria-label="Follow us on Twitter"
                    >
                      <Twitter size={18} strokeWidth={2} />
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="
                        flex items-center justify-center w-10 h-10
                        text-gray-400 hover:text-white
                        bg-gray-800 hover:bg-blue-700
                        rounded-lg transition-all duration-300
                        hover:scale-110 active:scale-95
                        focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 focus:ring-offset-gray-900
                      "
                      aria-label="Connect with us on LinkedIn"
                    >
                      <Linkedin size={18} strokeWidth={2} />
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="
                        flex items-center justify-center w-10 h-10
                        text-gray-400 hover:text-white
                        bg-gray-800 hover:bg-red-600
                        rounded-lg transition-all duration-300
                        hover:scale-110 active:scale-95
                        focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-gray-900
                      "
                      aria-label="Subscribe to our YouTube channel"
                    >
                      <Youtube size={18} strokeWidth={2} />
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Column 2: Contact Information */}
            <div>
              <h6 className="text-white font-inter font-semibold text-lg mb-6 tracking-wide">Get in Touch</h6>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin size={18} className="text-blue-400 mt-1 flex-shrink-0" strokeWidth={2} />
                  <p className="text-gray-400 font-inter text-sm leading-relaxed">
                    {resolved.formattedAddress ? (
                      <AddressLines address={resolved.formattedAddress} />
                    ) : (
                      "Address not available"
                    )}
                  </p>
                </div>

                {resolved.phoneNumber && (
                <div className="flex items-center space-x-3">
                  <Phone size={18} className="text-blue-400 flex-shrink-0" strokeWidth={2} />
                  <div className="space-y-1">
                    <p>
                      <a
                        href={formatTelHref(resolved.phoneNumber)}
                        className="text-gray-300 hover:text-white font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-white"
                      >
                        {resolved.phoneNumber}
                      </a>
                    </p>
                  </div>
                </div>
                )}

                {footerEmail && (
                <div className="flex items-center space-x-3">
                  <Mail size={18} className="text-blue-400 flex-shrink-0" strokeWidth={2} />
                  <p>
                    <a
                      href={`mailto:${footerEmail}`}
                      className="text-blue-400 hover:text-blue-300 font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-blue-300"
                    >
                      {footerEmail}
                    </a>
                  </p>
                </div>
                )}

                {resolved.websiteUrl && (
                <div className="flex items-center space-x-3">
                  <Globe size={18} className="text-blue-400 flex-shrink-0" strokeWidth={2} />
                  <p>
                    <a
                      href={resolved.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-blue-300"
                    >
                      {resolved.websiteUrl.replace(/^https?:\/\//, "")}
                    </a>
                  </p>
                </div>
                )}
              </div>
            </div>

            {/* Column 3: Quick Links — same items kept in the hub header */}
            <div>
              <h6 className="text-white font-inter font-semibold text-lg mb-6 tracking-wide">Quick Links</h6>
              <nav>
                <ul className="space-y-3">
                  <li>
                    <Link
                      href="/home#about-us"
                      className="text-gray-300 hover:text-white font-inter text-sm transition-colors duration-300 hover:translate-x-1 transform focus:outline-none focus:text-white block"
                    >
                      About
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/home#contact"
                      className="text-gray-300 hover:text-white font-inter text-sm transition-colors duration-300 hover:translate-x-1 transform focus:outline-none focus:text-white block"
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

          </div>
        </div>
      </div>

      {/* Copyright Section */}
      <div className={`${onHub ? "bg-[#A3124F] border-white/20" : "bg-gray-900 border-gray-800"} border-t w-full`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col items-center md:items-start gap-1">
            <p className="text-gray-400 font-inter text-sm text-center md:text-left">
              © {new Date().getFullYear()}{' '}
              <Link
                href="/"
                className="text-white hover:text-blue-400 transition-colors duration-300 focus:outline-none focus:text-blue-400"
              >
                Adwiise Agent
              </Link>
              . All rights reserved.
            </p>
            <p className="text-gray-500 font-inter text-[11px] md:text-xs text-center md:text-left">
              Powered by{' '}
              <a
                href="https://www.giventa.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-200 underline-offset-2 hover:underline"
              >
                Giventa Inc., USA
              </a>
              .
            </p>
            <p className="text-gray-500 font-inter text-[11px] md:text-xs text-center md:text-left">
              <a
                href="https://www.giventa.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-200 underline-offset-2 hover:underline"
              >
                www.giventa.com
              </a>
            </p>
            </div>

            <nav className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
              <Link
                href="#privacy"
                className="text-gray-400 hover:text-white font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-white"
              >
                Privacy Policy
              </Link>
              <Link
                href="#terms"
                className="text-gray-400 hover:text-white font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-white"
              >
                Terms of Service
              </Link>
              <Link
                href="#accessibility"
                className="text-gray-400 hover:text-white font-inter text-sm transition-colors duration-300 focus:outline-none focus:text-white"
              >
                Accessibility
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <BackToTopButton />
    </footer>
  );
};

export default Footer;
