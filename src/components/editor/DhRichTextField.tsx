import React from 'react';

interface DhRichTextFieldProps {
  label: string;
  valueHtml: string;
  onChange: (html: string) => void;
  helpText?: string;
  classNamePrefix: string;
}

export function DhRichTextField({
  label,
  valueHtml,
  onChange,
  helpText,
  classNamePrefix,
}: DhRichTextFieldProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    if (document.activeElement === el) return;
    if (el.innerHTML !== valueHtml) {
      el.innerHTML = valueHtml;
    }
  }, [valueHtml]);

  const syncHtml = React.useCallback(() => {
    if (!contentRef.current) return;
    onChange(contentRef.current.innerHTML);
  }, [onChange]);

  const applyCommand = (command: 'bold' | 'italic' | 'insertUnorderedList' | 'insertOrderedList') => {
    contentRef.current?.focus();
    document.execCommand(command);
    syncHtml();
  };

  return (
    <>
      <div className={`${classNamePrefix}-featuresLabel`}>{label}</div>
      <div className={`${classNamePrefix}-featuresPanel mt-1`}>
        <div className={`${classNamePrefix}-featuresToolbar flex items-center gap-2`}>
          <button type="button" onClick={() => applyCommand('bold')} className={`${classNamePrefix}-featureBtn`}>B</button>
          <button type="button" onClick={() => applyCommand('italic')} className={`${classNamePrefix}-featureBtn italic`}>I</button>
          <button type="button" onClick={() => applyCommand('insertUnorderedList')} className={`${classNamePrefix}-featureBtn`}>• List</button>
          <button type="button" onClick={() => applyCommand('insertOrderedList')} className={`${classNamePrefix}-featureBtn`}>1. List</button>
        </div>
        <div
          ref={contentRef}
          className={`${classNamePrefix}-featuresRichText`}
          contentEditable
          suppressContentEditableWarning
          onInput={syncHtml}
          onBlur={syncHtml}
        />
      </div>
      {helpText && <div className="text-xs text-gray-400 mt-2">{helpText}</div>}
    </>
  );
}
