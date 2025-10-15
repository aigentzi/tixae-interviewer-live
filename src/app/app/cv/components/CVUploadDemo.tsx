"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@root/components/ui/card";
import { Button } from "@root/components/ui/button";
import { FileText, Eye, Download } from "lucide-react";

const sampleCVText = `John Doe
Software Engineer | Full Stack Developer

Contact Information:
Email: john.doe@email.com
Phone: (555) 123-4567
LinkedIn: linkedin.com/in/johndoe
Location: San Francisco, CA

Professional Summary:
Experienced Full Stack Developer with 5+ years of expertise in React, Node.js, and cloud technologies. Proven track record of building scalable web applications and leading development teams.

Technical Skills:
• Frontend: React, TypeScript, Next.js, Tailwind CSS
• Backend: Node.js, Express, Python, PostgreSQL
• Cloud: AWS, Docker, Kubernetes
• Tools: Git, Jenkins, Jira, Figma

Work Experience:

Senior Software Engineer | TechCorp Inc. | 2021 - Present
• Led development of microservices architecture serving 100K+ users
• Reduced application load time by 40% through optimization
• Mentored 3 junior developers and conducted code reviews

Software Engineer | StartupXYZ | 2019 - 2021
• Built responsive web applications using React and Node.js
• Implemented automated testing reducing bugs by 60%
• Collaborated with design team to improve user experience

Education:
Bachelor of Science in Computer Science
University of California, Berkeley | 2015 - 2019
GPA: 3.8/4.0

Certifications:
• AWS Certified Solutions Architect
• Google Cloud Professional Developer
• Scrum Master Certification

Projects:
E-commerce Platform | React, Node.js, MongoDB
• Built full-featured online store with payment integration
• Implemented real-time inventory management
• Deployed on AWS with auto-scaling capabilities

Task Management App | Next.js, PostgreSQL
• Created collaborative workspace for teams
• Integrated real-time notifications and chat
• Achieved 99.9% uptime with comprehensive testing`;

export function CVUploadDemo() {
  const handleViewSample = () => {
    // Create a blob and download it as a sample CV
    const blob = new Blob([sampleCVText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_cv_extracted_text.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Sample CV Extraction Result
        </CardTitle>
        <CardDescription>
          Here's an example of what extracted CV text looks like after
          processing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={sampleCVText}
              readOnly
              className="w-full h-64 p-4 border rounded-lg bg-muted/30 text-xs font-mono resize-none focus:outline-none"
              placeholder="Sample extracted CV text..."
            />
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background px-2 py-1 rounded">
              {
                sampleCVText.split(/\s+/).filter((word) => word.length > 0)
                  .length
              }{" "}
              words
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="bordered"
              size="sm"
              onPress={() => navigator.clipboard.writeText(sampleCVText)}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Copy Sample Text
            </Button>
            <Button
              variant="bordered"
              size="sm"
              onPress={handleViewSample}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Sample
            </Button>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border">
            <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">
              What can you do with extracted CV text?
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Parse and analyze candidate skills and experience</li>
              <li>• Automatically match candidates to job requirements</li>
              <li>• Generate interview questions based on CV content</li>
              <li>• Create standardized candidate profiles</li>
              <li>• Integrate with ATS (Applicant Tracking Systems)</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
