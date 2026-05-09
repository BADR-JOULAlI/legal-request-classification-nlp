import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  ChevronDown,
  Clock3,
  FileText,
  Gauge,
  History,
  Home,
  Landmark,
  Loader2,
  Lock,
  Moon,
  Scale,
  Send,
  Settings,
  ShieldAlert,
  Tags,
  Zap
} from "lucide-react";
import { useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const labelMeta = {
  "criminal-law": {
    title: "Criminal Law",
    color: "#fb5168",
    icon: ShieldAlert
  },
  employment: {
    title: "Employment",
    color: "#35d4a8",
    icon: BriefcaseBusiness
  },
  "tax-law": {
    title: "Tax Law",
    color: "#f9a825",
    icon: Landmark
  },
  trademark: {
    title: "Trademark",
    color: "#7c5cff",
    icon: Tags
  }
};

const samples = [
  {
    label: "Tax",
    text: "I received a notice about unpaid income tax and I want to know whether deductions from last year can still be corrected."
  },
  {
    label: "Employment",
    text: "My employer ended my contract without notice after I reported unpaid overtime. What category does this request belong to?"
  },
  {
    label: "Trademark",
    text: "Another company is using a logo and brand name that look very close to mine for the same type of product."
  },
  {
    label: "Criminal",
    text: "A person was arrested after an alleged assault and needs to understand what kind of legal issue this is."
  }
];

const navigationItems = [
  { label: "Dashboard", icon: Home },
  { label: "Classify Request", icon: Brain, active: true },
  { label: "History", icon: History },
  { label: "Analytics", icon: BarChart3 },
  { label: "Knowledge Base", icon: BookOpen },
  { label: "Settings", icon: Settings }
];

function App() {
  const [text, setText] = useState(samples[2].text);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [processedSeconds, setProcessedSeconds] = useState(null);

  const characterCount = text.trim().length;
  const activeSample = samples.find((sample) => sample.text === text)?.label;
  const activeMeta = result ? labelMeta[result.label] || labelMeta[result.predictions?.[0]?.label] : null;
  const ActiveIcon = activeMeta?.icon || Gauge;
  const topScore = Math.round(Number(result?.score || 0) * 100);

  const sortedPredictions = useMemo(() => {
    if (!result?.predictions) {
      return [];
    }

    return [...result.predictions].sort((a, b) => b.score - a.score);
  }, [result]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setProcessedSeconds(null);

    if (!text.trim()) {
      setError("Please enter a legal request.");
      return;
    }

    setLoading(true);
    const startedAt = performance.now();

    try {
      const response = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Prediction failed.");
      }

      setProcessedSeconds(((performance.now() - startedAt) / 1000).toFixed(1));
      setResult(payload);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark">
            <Scale size={30} aria-hidden="true" />
          </div>
          <div>
            <strong>LawAI</strong>
            <span>Smart Legal Intelligence</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={`nav-item ${item.active ? "active" : ""}`} key={item.label} type="button">
                <Icon size={21} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="insight-card">
          <div className="insight-icon">
            <Zap size={22} aria-hidden="true" />
          </div>
          <strong>AI-Powered Legal Insights</strong>
          <p>Advanced NLP model for accurate legal classification.</p>
          <button type="button">Learn more</button>
        </div>

        <div className="profile-card">
          <div className="avatar" aria-hidden="true">
            BJ
          </div>
          <div>
            <strong>Badr Joulali</strong>
            <span>Legal NLP Project</span>
          </div>
          <ChevronDown size={18} aria-hidden="true" />
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Legal Request Classification</h1>
            <p>AI-powered legal categorization using DistilBERT model</p>
          </div>

          <div className="header-actions">
            <div className="model-pill">
              <span className="status-dot" />
              <span>Model: distilbert-base-cased</span>
              <ChevronDown size={18} aria-hidden="true" />
            </div>
            <button className="icon-button" type="button" aria-label="Theme mode">
              <Moon size={20} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="layout-grid">
          <section className="panel input-panel" aria-label="Prediction input">
            <form onSubmit={handleSubmit}>
              <div className="panel-heading">
                <div className="heading-lockup">
                  <span className="step-badge">1</span>
                  <div>
                    <h2>Your Legal Request</h2>
                    <p>Enter the details of your legal request</p>
                  </div>
                </div>
                <span className="count">{characterCount} / 4000</span>
              </div>

              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={4000}
                placeholder="Describe the legal question or request..."
              />

              <div className="sample-strip">
                <span>Try examples:</span>
                <div className="sample-row" aria-label="Sample requests">
                  {samples.map((sample) => (
                    <button
                      className={`sample-button ${activeSample === sample.label ? "active" : ""}`}
                      key={sample.label}
                      type="button"
                      onClick={() => {
                        setText(sample.text);
                        setResult(null);
                        setError("");
                        setProcessedSeconds(null);
                      }}
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              <button className="submit-button" type="submit" disabled={loading}>
                {loading ? <Loader2 className="spin" size={20} aria-hidden="true" /> : <Send size={20} aria-hidden="true" />}
                <span>{loading ? "Classifying Request" : "Classify Request"}</span>
              </button>

              <div className="secure-note">
                <Lock size={16} aria-hidden="true" />
                <span>Your data is secure and confidential</span>
              </div>
            </form>
          </section>

          <section className="panel result-panel" aria-label="Prediction result">
            <div className="panel-heading">
              <div className="heading-lockup">
                <span className="step-badge">2</span>
                <div>
                  <h2>Classification Result</h2>
                  <p>AI prediction and confidence scores</p>
                </div>
              </div>
              {processedSeconds && (
                <span className="processed-badge">
                  <Clock3 size={16} aria-hidden="true" />
                  Processed in {processedSeconds}s
                </span>
              )}
            </div>

            {error && (
              <div className="message error-message" role="alert">
                <AlertCircle size={20} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {!error && !result && (
              <div className="empty-state">
                <FileText size={34} aria-hidden="true" />
                <strong>Awaiting Classification</strong>
                <span>Submit a legal request to view model confidence scores.</span>
              </div>
            )}

            {result && (
              <>
                <div className="result-summary" style={{ "--accent": activeMeta?.color || "#7c5cff", "--score": topScore }}>
                  <div className="confidence-ring" aria-label={`Confidence ${topScore}%`}>
                    <span>{topScore}%</span>
                  </div>
                  <div className="top-category">
                    <span>Top Category</span>
                    <strong>{activeMeta?.title || result.label}</strong>
                    <em>{getConfidenceLabel(result.score)}</em>
                  </div>
                </div>

                <div className="scores-section">
                  <h3>Category Confidence Scores</h3>
                  <div className="score-list">
                    {sortedPredictions.map((prediction) => {
                      const meta = labelMeta[prediction.label] || {
                        title: prediction.label,
                        color: "#7c5cff",
                        icon: Gauge
                      };
                      const Icon = meta.icon;

                      return (
                        <div className="score-item" key={prediction.label} style={{ "--accent": meta.color }}>
                          <div className="score-icon">
                            <Icon size={21} aria-hidden="true" />
                          </div>
                          <div className="score-content">
                            <div className="score-label">
                              <span>{meta.title}</span>
                              <strong>{formatPercent(prediction.score)}</strong>
                            </div>
                            <div className="score-track">
                              <span
                                className="score-fill"
                                style={{
                                  width: `${Math.max(prediction.score * 100, 2)}%`
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {result.warning && (
                  <div className="message warning-message">
                    <AlertCircle size={19} aria-hidden="true" />
                    <span>{result.warning}</span>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <div className="tip-banner">
          <Gauge size={21} aria-hidden="true" />
          <span>
            <strong>Tip:</strong> Provide more details in your request to get more accurate classification results.
          </span>
        </div>
      </section>
    </main>
  );
}

function formatPercent(score) {
  return `${Math.round(Number(score || 0) * 100)}%`;
}

function getConfidenceLabel(score) {
  const value = Number(score || 0);

  if (value >= 0.85) {
    return "Very High Confidence";
  }

  if (value >= 0.65) {
    return "High Confidence";
  }

  if (value >= 0.4) {
    return "Medium Confidence";
  }

  return "Low Confidence";
}

export default App;
