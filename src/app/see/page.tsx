"use client";
import { useState } from "react";
import {
  Button,
  Textarea,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab,
} from "@heroui/react";
import {
  MAX_FEATURE_SCORE,
  SEE_CATEGORY_DESCRIPTIONS,
  SEE_FEATURE_BY_ID,
  SEE_FEATURES,
} from "./see.constants";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@root/components/ui/card";
import { Chip } from "@heroui/react";

type FeatureResult = {
  id: string;
  score: number;
  comment: string;
};

export default function SeePage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    features: FeatureResult[];
    overallSummary: string;
    seeScorePercent: number;
  } | null>(null);

  const analyze = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/see/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to analyze");
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">SEE Analysis (beta)</h1>
      <p className="text-sm text-muted-foreground">
        Paste the interview transcription below and click Analyze to compute the
        SEE score and per-feature feedback.
      </p>
      <Tabs fullWidth aria-label="SEE tabs">
        <Tab key="analysis" title="Analysis">
          <div className="space-y-4 pt-4">
            <Textarea
              placeholder="Paste transcription..."
              minRows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <Button onClick={analyze} disabled={loading || text.length < 30}>
                {loading ? "Analyzing..." : "Analyze"}
              </Button>
              {result && (
                <div className="text-sm">
                  Overall SEE: {result.seeScorePercent}%
                </div>
              )}
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            {result && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {result.overallSummary}
                </div>
                <Table aria-label="SEE Analysis">
                  <TableHeader>
                    <TableColumn>ID</TableColumn>
                    <TableColumn>Feature</TableColumn>
                    <TableColumn>Category</TableColumn>
                    <TableColumn>Weight</TableColumn>
                    <TableColumn>%</TableColumn>
                    <TableColumn>Score</TableColumn>
                    <TableColumn>Weighted %</TableColumn>
                    <TableColumn>Comment</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {result.features.map((f) => {
                      const def = SEE_FEATURE_BY_ID[f.id];
                      const weighted =
                        Math.round(
                          (def?.percentage || 0) *
                            (f.score / MAX_FEATURE_SCORE) *
                            10
                        ) / 10;
                      return (
                        <TableRow key={f.id}>
                          <TableCell>
                            <span className="font-mono text-xs">{f.id}</span>
                          </TableCell>
                          <TableCell>{def?.label || "-"}</TableCell>
                          <TableCell>{def?.category || "-"}</TableCell>
                          <TableCell>{def?.weight ?? "-"}</TableCell>
                          <TableCell>{def?.percentage ?? "-"}%</TableCell>
                          <TableCell>
                            {f.score}/{MAX_FEATURE_SCORE}
                          </TableCell>
                          <TableCell>{weighted}%</TableCell>
                          <TableCell className="max-w-[40ch]">
                            {f.comment}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="text-sm">
                  Overall SEE: {result.seeScorePercent}%
                </div>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground/80">
                    Column explanations
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <span className="font-medium">ID</span>: rubric code
                      (e.g., R1, A2).
                    </li>
                    <li>
                      <span className="font-medium">Feature</span>: the
                      skill/criterion name.
                    </li>
                    <li>
                      <span className="font-medium">Category</span>: grouping
                      (Range, Accuracy, Fluency, Interaction, Coherence).
                    </li>
                    <li>
                      <span className="font-medium">Weight</span>: relative
                      importance (1 or 0.5). Informational; contribution is
                      reflected by %.
                    </li>
                    <li>
                      <span className="font-medium">%</span>: fixed share of the
                      overall SEE (sums ≈ 100%).
                    </li>
                    <li>
                      <span className="font-medium">Score</span>: 0–
                      {MAX_FEATURE_SCORE} rating for the feature.
                    </li>
                    <li>
                      <span className="font-medium">Weighted %</span>: actual
                      contribution = % × (Score ÷ {MAX_FEATURE_SCORE}), rounded
                      to 0.1.
                    </li>
                    <li>
                      <span className="font-medium">Comment</span>: brief
                      feedback and suggestions.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </Tab>
        <Tab key="categories" title="Categories">
          <div className="pt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Object.entries(SEE_CATEGORY_DESCRIPTIONS).map(
              ([category, description]) => {
                const featuresInCategory = SEE_FEATURES.filter(
                  (f) => f.category === (category as any)
                );
                return (
                  <Card key={category} className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span>{category}</span>
                        <Chip size="sm" color="primary" variant="flat">
                          {featuresInCategory.length} features
                        </Chip>
                      </CardTitle>
                      <CardDescription>{description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="mt-2 list-disc pl-5 text-sm text-default-600 space-y-1">
                        {featuresInCategory.map((f) => (
                          <li key={f.id}>
                            <span className="font-medium">{f.label}</span>
                            <span className="text-default-500">
                              {" "}
                              · weight {f.weight}, {f.percentage}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              }
            )}
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
