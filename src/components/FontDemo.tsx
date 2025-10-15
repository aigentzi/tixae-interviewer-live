import { FONT_CLASSES, QUICK_FONTS } from "../lib/fonts.lib";

export function FontDemo() {
  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">Font System Demo</h2>

        {/* Poppins Headers */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-600">
            Poppins Headers:
          </h3>
          <h1 className={QUICK_FONTS.mainTitle}>
            Main Title (H1 Poppins Bold)
          </h1>
          <h2 className={QUICK_FONTS.sectionTitle}>
            Section Title (H2 Poppins Bold)
          </h2>
          <h3 className={QUICK_FONTS.cardTitle}>
            Card Title (H3 Poppins Semibold)
          </h3>
        </div>

        {/* Lexend Brand */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-600">Lexend Brand:</h3>
          <div className={QUICK_FONTS.brandTitle}>Tixae Interviewer</div>
          <div className={QUICK_FONTS.brandSubtitle}>
            AI-Powered Interview Platform
          </div>
        </div>

        {/* UI Elements */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-600">UI Elements:</h3>
          <button
            className={`${QUICK_FONTS.buttonText} px-4 py-2 bg-blue-600 text-white rounded`}
          >
            Button Text (Poppins Semibold)
          </button>
          <label className={`${QUICK_FONTS.formLabel} block text-gray-700`}>
            Form Label (Poppins Medium)
          </label>
        </div>

        {/* Body Text */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-600">Body Text:</h3>
          <p className={QUICK_FONTS.bodyText}>
            This is body text using Poppins Regular with proper line height for
            readability. It should be clean, modern, and easy to read across all
            screen sizes.
          </p>
        </div>

        {/* Modal Example */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-600">
            Modal Content (Lexend):
          </h3>
          <div className="border p-4 rounded bg-gray-50">
            <h4 className={QUICK_FONTS.modalTitle}>Modal Title</h4>
            <p className={QUICK_FONTS.modalBody}>
              Modal body text using Lexend with loose tracking for improved
              readability and confidence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
