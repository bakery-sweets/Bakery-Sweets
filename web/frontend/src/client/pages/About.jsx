import "./About.css";
export default function About() {
  return (
    <div className="about-page">
      <div className="about-banner">
        <img src="/assets/Img/banner2.jpg" alt="About The Sweets" />
        <div className="about-overlay">
          <h1>About The Sweets</h1>
          <p>Handcrafted with love, delivered with care.</p>
        </div>
      </div>
      <div className="about-content">
        <div className="about-section">
          <h2>Our Story</h2>
          <p>The Sweets was founded with a passion for creating exquisite handcrafted cakes and pastries. Every product is made fresh daily with the finest ingredients.</p>
        </div>
        <div className="about-section">
          <h2>Our Products</h2>
          <p>From delicate Mousse cakes to buttery Croissants and refreshing Drinks — we offer a range of premium baked goods for every occasion.</p>
        </div>
        <div className="about-section">
          <h2>Our Promise</h2>
          <p>We promise quality, freshness, and sweetness in every bite. Our team of skilled bakers works tirelessly to bring joy to your table.</p>
        </div>
      </div>
    </div>
  );
}
