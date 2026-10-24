import { Camera, Coffee, Headphones, Sparkles } from "lucide-react";
import styles from "./homepage-discovery.module.css";

/** Small vector product illustrations; decorative, with no retailer endorsement implied. */
export default function ProductDecor() {
  return <div className={styles.productDecor} aria-hidden="true">
    <span className={`${styles.productTile} ${styles.headphoneTile}`}><Headphones size={48} strokeWidth={1.5} /></span>
    <span className={`${styles.productTile} ${styles.cameraTile}`}><Camera size={37} strokeWidth={1.5} /></span>
    <span className={`${styles.productTile} ${styles.coffeeTile}`}><Coffee size={35} strokeWidth={1.5} /></span>
    <span className={styles.decorSpark}><Sparkles size={27} strokeWidth={1.5} /></span>
  </div>;
}
