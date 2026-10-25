import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import "./About.css";

export default function About() {
  const storeBranches = [
    {
      id: "branch-q5",
      tag: "Chi Nhánh 01",
      name: "Chi Nhánh 01 — Phường Chợ Lớn",
      address: "273 An Dương Vương, phường Chợ Lớn, TP. Hồ Chí Minh",
      hours: "08:00 AM – 10:00 PM (Thứ 2 – Chủ Nhật)",
      hotline: "1900 009",
      mapUrl: "https://maps.google.com/?q=273+An+Dương+Vương+Phường+2+Quận+5+TPHCM",
    },
    {
      id: "branch-q3",
      tag: "Chi Nhánh 02",
      name: "Chi Nhánh 02 — Phường Xuân Hòa",
      address: "105 Bà Huyện Thanh Quan, phường Xuân Hòa, TP. Hồ Chí Minh",
      hours: "08:00 AM – 10:00 PM (Thứ 2 – Chủ Nhật)",
      hotline: "1900 009",
      mapUrl: "https://maps.google.com/?q=105+Bà+Huyện+Thanh+Quan+Phường+6+Quận+3+TPHCM",
    },
  ];

  const qualityPillars = [
    {
      icon: "restaurant-outline",
      theme: "pink",
      title: "100% Nướng Mới Mỗi Ngày",
      desc: "Mỗi mẻ bánh đều ra lò trong ngày, tuyệt đối không phục vụ bánh cũ để giữ trọn độ ẩm xốp, vỏ giòn và thơm lừng bơ sữa.",
      highlight: "Tươi mới từ 06:00 AM",
    },
    {
      icon: "leaf-outline",
      theme: "blue",
      title: "Nguyên Liệu Tinh Tuyển",
      desc: "100% bơ động vật New Zealand, chocolate Bỉ 70%, bột mì hữu cơ Pháp và vani tự nhiên. Không hương liệu công nghiệp độc hại.",
      highlight: "Nguồn gốc minh bạch",
    },
    {
      icon: "color-wand-outline",
      theme: "pink",
      title: "Bàn Tay Nghệ Nhân",
      desc: "Kỹ thuật nhào bột, cán ngàn lớp lướt nhẹ và bắt kem thủ công tỉ mỉ từng chi tiết bởi những thợ bánh lành nghề đầy tâm huyết.",
      highlight: "100% Thủ công",
    },
    {
      icon: "scale-outline",
      theme: "blue",
      title: "Vị Ngọt Thanh Tao",
      desc: "Công thức cân chỉnh giảm 30% lượng đường, tôn vinh độ béo bùi và vị chua ngọt tự nhiên từ hoa quả mùa vụ tươi mọng.",
      highlight: "Hài hòa & Tốt sức khỏe",
    },
  ];

  const craftSteps = [
    {
      num: "01",
      title: "Tuyển Chọn Khắt Khe",
      desc: "Sàng lọc nguồn bơ ngậy hảo hạng, trứng tươi trang trại đạt chuẩn và trái cây hữu cơ mùa vụ tươi mới mỗi ngày.",
    },
    {
      num: "02",
      title: "Ủ Men Chậm & Nướng Mẻ Nhỏ",
      desc: "Quy trình ủ men tự nhiên kéo dài hơn 24 giờ, nướng canh lửa thủ công từng mẻ để cấu trúc bánh nở xốp hoàn mỹ.",
    },
    {
      num: "03",
      title: "Hoàn Thiện & Giao Trao Trọn Vẹn",
      desc: "Trang trí tỉ mỉ từng đường nét kem, đóng gói sang trọng trong hộp quà cao cấp trao gửi đến bàn tiệc của bạn.",
    },
  ];

  // Hiệu ứng cuộn tới đâu nội dung mờ rồi hiện ra tới đó (Scroll Reveal)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    const revealElements = document.querySelectorAll(
      ".about-fade-up, .about-fade-zoom"
    );
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="about-page-container">
      {/* 1. HERO BANNER */}
      <section className="about-hero">
        <div className="about-hero-backdrop"></div>
        <div className="about-content-wrap about-hero-inner">
          <h1 className="about-hero-brand">
            The Sweets
          </h1>
          <h2 className="about-hero-title">
            Nơi Mỗi Chiếc Bánh Là Một Tác Phẩm Nghệ&nbsp;Thuật
          </h2>
          <div className="about-hero-tagline">
            Đong Đầy Yêu Thương
          </div>
          <p className="about-hero-sub">
            Khởi nguồn từ niềm đam mê bột mì, men tự nhiên và bơ Pháp hảo hạng, The Sweets tạo nên
            những chiếc bánh thủ công thanh tao để gắn kết mọi khoảnh khắc sum vầy và ngọt ngào.
          </p>
        </div>
      </section>

      {/* 2. BRAND STORY & PHILOSOPHY */}
      <section className="about-story-sec">
        <div className="about-content-wrap story-layout">
          <div className="story-media-col about-fade-zoom">
            <div className="story-img-frame">
              <img
                src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80"
                alt="Nghệ nhân The Sweets làm bánh thủ công"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/assets/Img/banner2.jpg";
                }}
              />
              <div className="story-img-overlay-info">
                <span>Tỉ mỉ từng lớp ngàn lớp (Feuilletage)</span>
                <span className="story-tag-atelier">Artisanal Atelier</span>
              </div>
            </div>
            <div className="story-float-card">
              <div className="story-float-icon">
                <ion-icon name="ribbon-outline"></ion-icon>
              </div>
              <div>
                <h4>Haute Pâtisserie</h4>
                <p>Nghệ Thuật Bánh Pháp</p>
              </div>
            </div>
          </div>

          <div className="story-text-col about-fade-up">
            <span className="about-kicker-label">TRIẾT LÝ SÁNG TẠO</span>
            <h2 className="about-block-title">Tôn Trọng Sự Thuần Khiết Của Từng Nguyên Liệu</h2>
            <div className="story-paragraphs">
              <p>
                Tại <strong>The Sweets</strong>, mỗi chiếc bánh là một tác phẩm nghệ thuật, mang trong
                mình câu chuyện và hương vị độc đáo không thể trộn lẫn. Chúng tôi – những người thợ làm bánh
                tâm huyết, luôn đặt sự tỉ mỉ và tình yêu vào từng chi tiết nhỏ nhất.
              </p>
              <p>
                Chúng tôi tôn trọng sự nguyên bản và tự nhiên của từng nguyên liệu, để dù mỗi thứ đều có
                những nét riêng, chúng vẫn kết hợp hài hòa tạo nên những chiếc bánh thơm ngon, đẹp mắt và
                trọn vẹn phong vị. Nếu bạn đang tìm kiếm những hương vị tinh tế, mộc mạc nhưng vẹn tròn cảm
                xúc, The Sweets luôn có những điều đặc biệt chờ đón bạn khám phá.
              </p>
            </div>

            <div className="story-quote-card about-fade-up">
              <span className="quote-icon-decor">“</span>
              <p className="quote-text-line">
                Bánh ngon bắt đầu từ sự chân thành của người thợ và sự thuần khiết nguyên bản mà thiên nhiên ban tặng.
              </p>
              <div className="quote-author-info">
                <span className="quote-author-bar"></span>
                <strong>Bếp Trưởng &amp; Đồng Sáng Lập The Sweets</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE VALUES - 4 QUALITY PILLARS */}
      <section className="about-pillars-sec">
        <div className="about-content-wrap">
          <div className="about-header-centered about-fade-up">
            <span className="about-kicker-label">GIÁ TRỊ CỐT LÕI</span>
            <h2 className="about-block-title">Sự Khắt Khe Tạo Nên Từng Trải Nghiệm Hoàn Mỹ</h2>
            <p className="about-block-subtitle">
              Cam kết bảo toàn trọn vẹn sức khỏe và niềm hân hoan vị giác của quý khách hàng qua từng mẻ bánh.
            </p>
          </div>

          <div className="about-pillars-grid">
            {qualityPillars.map((item, index) => (
              <div
                key={index}
                className={`about-pillar-card about-fade-up delay-${index + 1}`}
              >
                <div className={`pillar-icon-circle ${item.theme}`}>
                  <ion-icon name={item.icon}></ion-icon>
                </div>
                <h3 className="pillar-item-title">{item.title}</h3>
                <p className="pillar-item-desc">{item.desc}</p>
                <div className="pillar-item-footer">
                  <ion-icon name="checkmark-circle-outline"></ion-icon>
                  <span>{item.highlight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. THE CRAFT JOURNEY */}
      <section className="about-craft-sec">
        <div className="about-content-wrap">
          <div className="about-header-centered about-fade-up">
            <span className="about-kicker-label">HÀNH TRÌNH TẠO TÁC</span>
            <h2 className="about-block-title">Kỹ Nghệ Làm Bánh Bằng Cả Trái Tim</h2>
            <p className="about-block-subtitle">
              Từng công đoạn là sự kết tinh của tính kỷ luật nghiêm ngặt và tình yêu vô tận với nghề thủ công.
            </p>
          </div>

          <div className="about-craft-grid">
            {craftSteps.map((step, idx) => (
              <div
                key={idx}
                className={`about-craft-card about-fade-up delay-${idx + 1}`}
              >
                <div className="craft-card-top">
                  <span className="craft-card-number">{step.num}</span>
                  <div className="craft-card-icon-pill">
                    <ion-icon name="checkmark-done-outline"></ion-icon>
                  </div>
                </div>
                <h3 className="craft-card-title">{step.title}</h3>
                <p className="craft-card-text">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. STORE LOCATIONS & CONTACT */}
      <section className="about-stores-sec">
        <div className="about-content-wrap">
          <div className="about-header-centered about-fade-up">
            <span className="about-kicker-label">HỆ THỐNG CỬA HÀNG</span>
            <h2 className="about-block-title">The Sweets</h2>
            <p className="about-block-subtitle">
              Cùng đấm chìm trong những chiếc bánh thơm lừng và sang trọng của chúng tôi.
            </p>
          </div>
          {/* DẢI HỖ TRỢ TRỰC TIẾP */}
          <div className="about-support-banner about-fade-up">
            <div className="support-banner-item">
              <ion-icon name="headset-outline" className="support-icon-pink"></ion-icon>
              <span>CSKH &amp; Khiếu Nại: <strong>0908 070 605</strong></span>
            </div>
            <div className="support-banner-divider"></div>
            <div className="support-banner-item">
              <ion-icon name="mail-outline" className="support-icon-navy"></ion-icon>
              <span>Email: <strong>thesweets@gmail.com</strong></span>
            </div>
            <div className="support-banner-divider"></div>
            <div className="support-banner-item">
              <ion-icon name="calendar-outline" className="support-icon-pink"></ion-icon>
              <span>Lịch Hoạt Động: <strong>08:00 AM – 10:00 PM (Thứ 2 – CN)</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL-TO-ACTION SECTION */}
      <section className="about-cta-sec">
        <div className="about-content-wrap">
          <div className="about-cta-box about-fade-up">
            <div className="about-cta-glow"></div>
            <div className="about-cta-content">
              <div className="about-cta-tag">
                <span>Khoảnh Khắc Ngọt Ngào</span>
              </div>
              <h2 className="about-cta-title">Cùng The Sweets Tạo Nên Kỷ Niệm Ngọt Ngào</h2>
              <p className="about-cta-desc">
                Dù là bữa tiệc sinh nhật ấm cúng, buổi trà chiều cùng bạn bè hay món quà tinh tế cho người
                thương, chúng tôi luôn sẵn sàng lắng nghe và chăm chút cho bạn.
              </p>
              <div className="about-cta-actions">
                <Link to="/products" className="about-btn-cta-primary">
                  <span>Khám Phá Thực Đơn Bánh</span>
                  <ion-icon name="arrow-forward-outline"></ion-icon>
                </Link>
                <a href="tel:1900009" className="about-btn-cta-secondary">
                  <ion-icon name="call-outline"></ion-icon>
                  <span>Liên hệ: 1900 009</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
