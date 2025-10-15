export function ColorDemo() {
  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          TIXAE Color Palette Demo
        </h2>
        <p className="text-foreground-600">
          Showcasing the brand colors in current theme
        </p>
      </div>

      {/* Core Brand Colors */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-foreground">
          Core Brand Colors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Primary - Tixae Gold */}
          <div className="space-y-2">
            <div className="h-20 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-medium">
                Primary
              </span>
            </div>
            <div className="text-sm">
              <div className="font-medium text-foreground">Tixae Gold</div>
              <div className="text-foreground-600">#CDA253</div>
              <div className="text-foreground-500">Call-to-action elements</div>
            </div>
          </div>

          {/* Secondary - Slate Blue */}
          <div className="space-y-2">
            <div className="h-20 bg-secondary rounded-lg flex items-center justify-center">
              <span className="text-secondary-foreground font-medium">
                Secondary
              </span>
            </div>
            <div className="text-sm">
              <div className="font-medium text-foreground">Slate Blue</div>
              <div className="text-foreground-600">#354564</div>
              <div className="text-foreground-500">Secondary CTA, links</div>
            </div>
          </div>

          {/* Default - Cool Gray */}
          <div className="space-y-2">
            <div className="h-20 bg-default rounded-lg flex items-center justify-center border border-default-300">
              <span className="text-default-foreground font-medium">
                Default
              </span>
            </div>
            <div className="text-sm">
              <div className="font-medium text-foreground">Cool Gray</div>
              <div className="text-foreground-600">#B1B5BD</div>
              <div className="text-foreground-500">UI borders, subtext</div>
            </div>
          </div>

          {/* Background showcase */}
          <div className="space-y-2">
            <div className="h-20 bg-background border-2 border-foreground-200 rounded-lg flex items-center justify-center">
              <span className="text-foreground font-medium">Background</span>
            </div>
            <div className="text-sm">
              <div className="font-medium text-foreground">Base Colors</div>
              <div className="text-foreground-600">Charcoal / Cloud White</div>
              <div className="text-foreground-500">Primary background</div>
            </div>
          </div>
        </div>
      </div>

      {/* State Colors */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-foreground">
          State/Signal Colors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Success */}
          <div className="space-y-2">
            <div className="h-20 bg-success rounded-lg flex items-center justify-center">
              <span className="text-success-foreground font-medium">
                Success
              </span>
            </div>
            <div className="text-sm">
              <div className="font-medium text-foreground">Success Green</div>
              <div className="text-foreground-600">#38B48B</div>
              <div className="text-foreground-500">
                Interview completed, OK messages
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="space-y-2">
            <div className="h-20 bg-warning rounded-lg flex items-center justify-center">
              <span className="text-warning-foreground font-medium">
                Warning
              </span>
            </div>
            <div className="text-sm">
              <div className="font-medium text-foreground">Warning Yellow</div>
              <div className="text-foreground-600">#FFD666</div>
              <div className="text-foreground-500">
                Confirmation, caution prompts
              </div>
            </div>
          </div>

          {/* Danger */}
          <div className="space-y-2">
            <div className="h-20 bg-danger rounded-lg flex items-center justify-center">
              <span className="text-danger-foreground font-medium">Danger</span>
            </div>
            <div className="text-sm">
              <div className="font-medium text-foreground">Error Red</div>
              <div className="text-foreground-600">#D64545</div>
              <div className="text-foreground-500">
                Validation, system errors
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-foreground">
          Usage Examples
        </h3>
        <div className="space-y-4">
          {/* Buttons */}
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Buttons</h4>
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
                Primary CTA
              </button>
              <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:opacity-90 transition-opacity">
                Secondary Action
              </button>
              <button className="px-4 py-2 bg-success text-success-foreground rounded-md hover:opacity-90 transition-opacity">
                Confirm
              </button>
              <button className="px-4 py-2 bg-warning text-warning-foreground rounded-md hover:opacity-90 transition-opacity">
                Caution
              </button>
              <button className="px-4 py-2 bg-danger text-danger-foreground rounded-md hover:opacity-90 transition-opacity">
                Delete
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Cards & Content</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-content2 rounded-lg border border-default-200">
                <h5 className="font-medium text-foreground mb-2">
                  Interview Session
                </h5>
                <p className="text-foreground-600 text-sm mb-3">
                  Your interview is scheduled and ready to begin. Make sure you
                  have a quiet environment.
                </p>
                <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
                  Start Interview
                </button>
              </div>

              <div className="p-4 bg-content3 rounded-lg border border-default-300">
                <h5 className="font-medium text-foreground mb-2">
                  Feedback Summary
                </h5>
                <p className="text-foreground-600 text-sm mb-3">
                  Review your performance metrics and detailed feedback from the
                  AI interviewer.
                </p>
                <button className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm">
                  View Results
                </button>
              </div>
            </div>
          </div>

          {/* Text Hierarchy */}
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Text Hierarchy</h4>
            <div className="space-y-2">
              <div className="text-foreground text-lg font-bold">
                Primary Text (foreground)
              </div>
              <div className="text-foreground-700">
                Secondary Text (foreground-700)
              </div>
              <div className="text-foreground-600">
                Body Text (foreground-600)
              </div>
              <div className="text-foreground-500">
                Muted Text (foreground-500)
              </div>
              <div className="text-foreground-400">
                Disabled Text (foreground-400)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
