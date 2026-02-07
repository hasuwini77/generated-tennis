import React from 'react';

interface ScoutReportProps {
  content: string;
  onCopy: () => void;
  onPushToDiscord: () => void;
  isSending: boolean;
}

const ScoutReportArticle: React.FC<ScoutReportProps> = ({ content, onCopy, onPushToDiscord, isSending }) => {
  // Parse the markdown-style content into structured sections
  const parseContent = (text: string) => {
    const sections: { title: string; content: string; type?: string }[] = [];
    const lines = text.split('\n');
    let currentSection = { title: '', content: '', type: '' };
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Main title (starts with emoji and bold)
      if (trimmed.startsWith('🏒') && trimmed.includes('**')) {
        currentSection = { 
          title: trimmed.replace(/\*\*/g, '').replace('🏒', '').trim(), 
          content: '', 
          type: 'main-title' 
        };
        sections.push(currentSection);
      }
      // Section headers (### format)
      else if (trimmed.startsWith('###')) {
        if (currentSection.content) {
          sections.push(currentSection);
        }
        const headerText = trimmed.replace(/###/g, '').replace(/\*\*/g, '').trim();
        let type = 'section';
        if (headerText.includes('VALUE KING')) type = 'value-king';
        else if (headerText.includes('POWER PICK')) type = 'power-pick';
        else if (headerText.includes('ICE LANDSCAPE')) type = 'landscape';
        
        currentSection = { title: headerText, content: '', type };
      }
      // Horizontal rules
      else if (trimmed === '---') {
        // Skip, we'll use our own separators
      }
      // Content lines
      else if (trimmed && !trimmed.startsWith('🏒')) {
        currentSection.content += line + '\n';
      }
    });
    
    if (currentSection.content) {
      sections.push(currentSection);
    }
    
    return sections;
  };

  const sections = parseContent(content);

  // Format individual lines within content
  const formatContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      
      // Bold text
      let formatted = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong class="text-blue-400 font-black">$1</strong>');
      
      // Bullet points
      if (trimmed.startsWith('*') || trimmed.startsWith('•')) {
        formatted = formatted.replace(/^[*•]\s*/, '');
        return (
          <div key={i} className="flex items-start gap-3 mb-2">
            <span className="text-blue-500 mt-1">▸</span>
            <p className="text-slate-300 text-sm leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: formatted }} />
          </div>
        );
      }
      
      // Match/Metric lines
      if (trimmed.startsWith('**Match:**') || trimmed.startsWith('**Metric:**') || trimmed.startsWith('**Odds:**')) {
        return (
          <p key={i} className="text-slate-200 text-sm mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />
        );
      }
      
      // Analysis/regular paragraphs
      return (
        <p key={i} className="text-slate-300 text-sm mb-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    });
  };

  return (
    <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tight text-white">Scout Report</h2>
              <p className="text-[11px] text-blue-100 font-bold uppercase tracking-widest">Daily Hockey Analytics</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onCopy}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-xs font-bold transition-all uppercase text-white border border-white/30 active:scale-95"
            >
              Copy
            </button>
            <button 
              onClick={onPushToDiscord}
              disabled={isSending}
              className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] rounded-lg text-xs font-black transition-all active:scale-95 disabled:opacity-50 uppercase flex items-center gap-2 text-white shadow-lg"
            >
              {isSending ? "Pushing..." : "Push to Discord"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {sections.map((section, idx) => {
          if (section.type === 'main-title') {
            return (
              <div key={idx} className="mb-6">
                <div className="text-center">
                  <h1 className="text-3xl font-black uppercase italic bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent mb-2">
                    {section.title}
                  </h1>
                  <div className="h-1 w-24 bg-gradient-to-r from-blue-600 to-blue-400 mx-auto rounded-full"></div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mt-4 max-w-3xl mx-auto">
                  {formatContent(section.content)}
                </p>
              </div>
            );
          }

          if (section.type === 'value-king') {
            return (
              <div key={idx} className="mb-8">
                <div className="bg-gradient-to-br from-amber-500/10 to-transparent rounded-xl border border-amber-500/30 p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg">
                      <span className="text-white text-xl">👑</span>
                    </div>
                    <h3 className="text-xl font-black uppercase italic text-amber-400">
                      {section.title}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {formatContent(section.content)}
                  </div>
                </div>
              </div>
            );
          }

          if (section.type === 'power-pick') {
            return (
              <div key={idx} className="mb-8">
                <div className="bg-gradient-to-br from-red-500/10 to-transparent rounded-xl border border-red-500/30 p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
                      <span className="text-white text-xl">🔥</span>
                    </div>
                    <h3 className="text-xl font-black uppercase italic text-red-400">
                      {section.title}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {formatContent(section.content)}
                  </div>
                </div>
              </div>
            );
          }

          if (section.type === 'landscape') {
            return (
              <div key={idx} className="mb-8">
                <div className="bg-gradient-to-br from-blue-500/10 to-transparent rounded-xl border border-blue-500/30 p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                      <span className="text-white text-xl">⚡</span>
                    </div>
                    <h3 className="text-xl font-black uppercase italic text-blue-400">
                      {section.title}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {formatContent(section.content)}
                  </div>
                </div>
              </div>
            );
          }

          // Regular section
          return (
            <div key={idx} className="mb-6">
              {section.title && (
                <h4 className="text-lg font-bold text-slate-200 mb-3 uppercase tracking-wide">
                  {section.title}
                </h4>
              )}
              <div className="space-y-2">
                {formatContent(section.content)}
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span>Powered by Gemini 3 Flash</span>
            </div>
            <div>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScoutReportArticle;
