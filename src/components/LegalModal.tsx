import { X } from "lucide-react";
import { ReactNode } from "react";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function LegalModal({ isOpen, onClose, title, children }: LegalModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[20px] w-full max-w-[560px] max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom: "1px solid #E5E7EB" }}>
          <h2 className="font-heading font-semibold text-lg" style={{ color: "#2D7D6F" }}>{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 text-sm text-gray-600 leading-relaxed space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export function TermsContent() {
  return (
    <>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Last updated March 2026</p>

      <section>
        <h3 className="font-semibold text-gray-800 mb-1">Purpose</h3>
        <p>PULZ is a personal wellness tracking tool designed to help individuals monitor behavioural and physiological patterns related to eating and emotional health. PULZ is <strong>not a medical device</strong> and does not provide diagnosis, treatment, or clinical intervention of any kind.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-800 mb-1">Clinical disclaimer</h3>
        <p>PULZ does not diagnose, treat, or replace professional medical or psychiatric care. If you are experiencing a medical emergency, contact emergency services immediately. Always consult a qualified healthcare professional before making decisions about your health.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-800 mb-1">Data usage</h3>
        <p>Biometric data, self-reports, and other information you provide are used solely to generate personalised wellness insights within the app. Your data is never used for advertising or sold to any third party.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-800 mb-1">Data storage</h3>
        <p>All data is stored encrypted via Supabase infrastructure. Data is never shared with third parties beyond what is necessary to provide the service.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-800 mb-1">Your rights</h3>
        <p>You may export or permanently delete all your data at any time from the Settings page. Deletion is irreversible.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-800 mb-1">Age requirement</h3>
        <p>You must be 18 years of age or older to use PULZ. By creating an account you confirm you meet this requirement.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-800 mb-1">Changes to these terms</h3>
        <p>We may update these Terms of Service. Continued use of PULZ after changes constitutes acceptance of the revised terms.</p>
      </section>
    </>
  );
}

export function PrivacyContent() {
  return (
    <>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Last updated March 2026</p>

      <section>
        <h3 className="font-semibold text-gray-800 mb-1">What data we collect</h3>
        <ul className="list-disc list-inside space-y-0.5 text-gray-600">
          <li>Account information: name, email address</li>
          <li>Health profile: date of birth, height, weight, health conditions</li>
          <li>Biometric data: heart rate, HRV, and related sensor data from connected devices</li>
          <li>Self-reports: manually logged episodes, emotional states, and notes</li>
          <li>App usage: feature interactions used to improve personalisation</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-800 mb-1">How we use it</h3>
        <p>Your data is used to generate personalised risk insights and intervention prompts within the app. Data is shared with your assigned specialist only with your explicit consent, controlled in Settings.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-800 mb-1">Data retention</h3>
        <p>You control your data retention period (30, 60, or 90 days) in Settings. Data beyond your chosen retention window is automatically deleted.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-800 mb-1">Third parties</h3>
        <p>We use Supabase for secure data storage and authentication. No data is shared with advertising platforms, data brokers, or any other third parties.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-800 mb-1">Your rights</h3>
        <ul className="list-disc list-inside space-y-0.5 text-gray-600">
          <li>Access: view all data stored about you</li>
          <li>Export: download your data as CSV from Settings</li>
          <li>Correction: update your profile and health information at any time</li>
          <li>Deletion: permanently delete all data from Settings</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-800 mb-1">Contact</h3>
        <p>For privacy enquiries contact us at <a href="mailto:privacy@pulz.app" className="underline" style={{ color: "#2D7D6F" }}>privacy@pulz.app</a>.</p>
      </section>
    </>
  );
}
