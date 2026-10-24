import "./About.css";
export default function About() {
  return (
    <div className="about-page">
      <div className="about-banner">
        <img src="/assets/Img/banner2.jpg" alt="Giới thiệu The Sweets" />
        <div className="about-overlay">
          <h1>Về The Sweets</h1>
          <p>Làm thủ công bằng cả tấm lòng, trao tận tay bằng sự chu đáo.</p>
        </div>
      </div>
      <div className="about-content">
        <div className="about-section">
          <h2>Câu chuyện của chúng tôi</h2>
          <p>The Sweets ra đời từ niềm đam mê tạo nên những chiếc bánh thủ công tinh tế. Mỗi sản phẩm đều được làm mới mỗi ngày từ những nguyên liệu tốt nhất.</p>
        </div>
        <div className="about-section">
          <h2>Sản phẩm của chúng tôi</h2>
          <p>Từ bánh Mousse mềm mịn đến Croissant thơm bơ — chúng tôi mang đến nhiều loại bánh cao cấp cho mọi dịp.</p>
        </div>
        <div className="about-section">
          <h2>Cam kết của chúng tôi</h2>
          <p>Chúng tôi cam kết chất lượng, độ tươi ngon và vị ngọt trọn vẹn trong từng miếng bánh. Đội ngũ thợ bánh lành nghề luôn tận tâm mang niềm vui đến bàn ăn của bạn.</p>
        </div>
      </div>
    </div>
  );
}
