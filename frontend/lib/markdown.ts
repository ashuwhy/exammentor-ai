
/**
 * Simple Regex-based Markdown Formatter
 * Used to render Tutor explanations with premium styling without heavy dependencies.
 */
export function formatMarkdown(text: string): string {
  if (!text) return '';

  let html = text
    // Horizontal Rules
    .replace(/^---$/gm, '<hr class="my-6 border-border/50" />')
    
    // Headers
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-6 mb-3 text-foreground/90">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-8 mb-4 text-foreground border-b border-border/50 pb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-8 mb-6 text-foreground">$1</h1>')
    
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
    
    // Italic
    .replace(/\*(.*?)\*/g, '<em class="italic text-foreground/80">$1</em>')
    
    // Unordered Lists - Wrap consecutive items in <ul> is hard with simple regex. 
    // We'll style individual <li> to look decent even if not strictly semantic <ul> wrapped.
    .replace(/^\s*[-•] (.*$)/gm, '<div class="flex gap-2 mb-2 ml-1"><span class="text-primary mt-1.5">•</span><span class="flex-1">$1</span></div>')
    
    // Ordered Lists
    .replace(/^\s*(\d+)\. (.*$)/gm, '<div class="flex gap-2 mb-2 ml-1"><span class="font-medium text-primary mt-0.5">$1.</span><span class="flex-1">$2</span></div>')
    
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted/50 border border-border/50 p-4 rounded-lg overflow-x-auto my-4 text-sm font-mono text-muted-foreground">$1</pre>')
    
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-muted/50 border border-border/50 px-1.5 py-0.5 rounded text-sm font-mono text-foreground/90">$1</code>')
    
    // Blockquotes
    .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-4 bg-primary/5 py-2 rounded-r">$1</blockquote>')

  // Handle Paragraphs and Line Breaks
  // We split by double newline to identify paragraphs.
  const blocks = html.split(/\n\n+/);
  
  return blocks.map(block => {
    block = block.trim();
    if (!block) return '';
    
    // If block starts with a tag we generated (div, h, pre, hr, blockquote), don't wrap in p
    if (block.match(/^(<div|<h[1-6]|<hr|<pre|<blockquote)/)) {
      return block;
    }
    
    // Otherwise treat as paragraph
    return `<p class="mb-4 leading-relaxed text-foreground/80">${block.replace(/\n/g, '<br />')}</p>`;
  }).join('');
}
