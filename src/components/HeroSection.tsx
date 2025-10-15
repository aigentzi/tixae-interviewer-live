import React from "react";
import { Button } from "@root/components/ui/button";
import { FaPlus, FaVideo } from "react-icons/fa";

interface HeroSectionProps {
  onCreateInterview?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onCreateInterview }) => {
  return (
    <div className="min-h-[calc(100vh-70px)] flex items-center justify-center p-4">
      <div className="rounded-xl shadow-lg border border-default-200 p-8 max-w-md w-full text-center bg-default-100">
        {/* Icon */}
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FaVideo className="w-8 h-8 text-primary-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-default-900 mb-3">
          Welcome to Tixae Interviewer
        </h1>

        {/* Description */}
        <p className="text-default-600 mb-8 leading-relaxed">
          Start by creating your first interview to practice and improve your
          skills with AI-powered feedback.
        </p>

        {/* CTA Button */}
        <Button
          onClick={onCreateInterview}
          className="w-full bg-primary hover:bg-primary-600 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200"
        >
          <FaPlus className="w-4 h-4 mr-2" />
          Create Your First Interview
        </Button>

        {/* Helper Text */}
        <p className="text-sm text-default-500 mt-4">
          You can customize and practice different interview scenarios later
        </p>
      </div>
    </div>
  );
};

export default HeroSection;
