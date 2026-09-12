import React from 'react';

interface AboutSectionProps {
  title: string;
  content: string;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ title, content }) => {
  return (
    <section className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 mb-10">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
        <span className="w-1.5 h-5 bg-[#0f3822] rounded-full mr-2.5 inline-block"></span>
        <span id="about-title">{title}</span>
      </h3>

      {/* Content paragraphs */}
      <div
        id="about-content"
        className="text-gray-600 leading-relaxed text-sm space-y-4 whitespace-pre-line"
      >
        {content}
      </div>
    </section>
  );
};

