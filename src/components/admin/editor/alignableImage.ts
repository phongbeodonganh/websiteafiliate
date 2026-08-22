import Image from '@tiptap/extension-image';

// Mở rộng Image mặc định thêm attribute `align`, render ra `class="img-align-*"`
// (định nghĩa CSS tương ứng trong globals.css) — không dùng inline `style` vì
// sanitize.ts (allowlist chống XSS) không cho phép attribute `style` trên <img>.
// `width`/`height` đã là attribute mặc định sẵn có của @tiptap/extension-image
// và cũng nằm trong allowlist, dùng luôn cho phần resize (set theo %).
export const AlignableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null,
        parseHTML: (element) => {
          const match = element.getAttribute('class')?.match(/img-align-(left|center|right)/);
          return match ? match[1] : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.align) return {};
          return { class: `img-align-${attributes.align}` };
        },
      },
    };
  },
});
