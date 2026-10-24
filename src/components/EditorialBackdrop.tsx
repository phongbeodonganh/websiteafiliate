type EditorialBackdropProps = {
  section: string;
};

export default function EditorialBackdrop({ section }: EditorialBackdropProps) {
  return (
    <div className="editorial-backdrop" aria-hidden="true">
      <div className="editorial-backdrop-grid">
        <span className="editorial-backdrop-rail">THEHAVENDEALS / {section}</span>
        <span className="editorial-backdrop-issue">VOL. 01 / 2026</span>
        <span className="editorial-backdrop-folio">H</span>
      </div>
    </div>
  );
}
