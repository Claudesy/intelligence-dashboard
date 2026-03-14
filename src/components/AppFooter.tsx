// Designed and constructed by Claudesy.
"use client";

import Link from "next/link";

const FOOTER_LINK_GROUPS = [
  {
    title: "Jelajah",
    links: [
      { href: "/emr", label: "EMR Klinis" },
      { href: "/voice", label: "Consult Audrey" },
      { href: "/icdx", label: "Ascriva ICDX" },
      { href: "/report", label: "Report" },
    ],
  },
  {
    title: "Clinical Stack",
    links: [
      { href: "/emr", label: "CDSS & Assessment" },
      { href: "/emr", label: "Prognosis" },
      { href: "/emr", label: "Pharmacology" },
      { href: "/report", label: "SP3 & LB1" },
    ],
  },
  {
    title: "Legal & Governance",
    links: [
      { href: "/legal#disclaimer", label: "Disclaimer AI" },
      { href: "/legal#privacy", label: "Privasi Data" },
      { href: "/legal#terms", label: "Ketentuan Penggunaan" },
      { href: "/legal#security", label: "Keamanan Informasi" },
    ],
  },
];

export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer" aria-label="Footer aplikasi">
      <div className="app-footer-topline" />

      <div className="app-footer-hero">
        <div className="app-footer-hero-main">
          <div className="app-footer-kicker">Sentra Healthcare Solutions</div>
          <h2 className="app-footer-title">Puskesmas Intelligence Dashboard</h2>
        </div>

        <div className="app-footer-summary">
          <p>
            Sistem Rekam Medis Elektronik (EMR) klinis ini saat ini masih dalam
            tahap pengembangan intensif. Dengan demikian, fitur, data, dan
            fungsionalitas yang tersedia mungkin belum sepenuhnya akurat dan
            stabil.
          </p>
          <p>
            Seluruh hak kekayaan intelektual, properti, dan konten yang terkait
            dengan sistem ini adalah milik Sentra Healthcare Artificial
            Intelligent.
          </p>
          <p>
            Dilarang keras menggandakan, mendistribusikan, memodifikasi, atau
            menggunakan sistem ini tanpa izin tertulis dari pemilik yang sah.
          </p>
        </div>
      </div>

      <div className="app-footer-grid">
        {FOOTER_LINK_GROUPS.map((group) => (
          <section key={group.title} className="app-footer-section">
            <div className="app-footer-section-title">{group.title}</div>
            <div className="app-footer-links">
              {group.links.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  className="app-footer-link"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section className="app-footer-section app-footer-section-meta">
          <div className="app-footer-section-title">Lingkup</div>
          <div className="app-footer-meta-list">
            <div>Poli Umum Dewasa</div>
            <div>Puskesmas Balowerti Kota Kediri</div>
            <div>Clinical workflow · reporting · decision support</div>
          </div>
        </section>
      </div>

      <div className="app-footer-bottomline">
        <div>© {year} Sentra Healthcare Solutions</div>
        <div>Designed for disciplined, daily clinical operations.</div>
      </div>
    </footer>
  );
}
