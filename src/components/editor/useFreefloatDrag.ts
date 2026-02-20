import { useCallback } from 'react';

/**
 * Custom drag hook for freefloat-positioned embed nodes.
 * Freefloat uses float + margin offsets (not absolute positioning) so text
 * continues to wrap around the embed.
 * - Dragging right/left adjusts x (margin from the float side edge)
 * - Dragging down/up adjusts y (margin-top, min 0)
 */
export function useFreefloatDrag(
  attrs: { x?: string; y?: string },
  updateAttributes: (attrs: Record<string, unknown>) => void,
) {
  return useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startX = parseInt(attrs.x || '0', 10);
      const startY = parseInt(attrs.y || '0', 10);

      const onMove = (me: MouseEvent) => {
        updateAttributes({
          x: String(startX + (me.clientX - startMouseX)),
          y: String(startY + (me.clientY - startMouseY)),
        });
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attrs.x, attrs.y, updateAttributes],
  );
}
