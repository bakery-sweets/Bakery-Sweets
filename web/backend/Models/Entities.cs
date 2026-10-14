using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebBackend.Models;

// ============================================================
// PHẦN 1: TÀI KHOẢN XÁC THỰC
// ============================================================
[Table("users")]
public class User
{
    [Key]
    [Column("user_name")]
    [MaxLength(255)]
    public string UserName { get; set; } = string.Empty;

    [Column("email")]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Column("password")]
    [MaxLength(255)]
    public string Password { get; set; } = string.Empty;

    [Column("role")]
    [MaxLength(20)]
    public string Role { get; set; } = "customer";

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "active";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Customer? Customer { get; set; }
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}

// ============================================================
// PHẦN 2: KHÁCH HÀNG
// ============================================================
[Table("customers")]
public class Customer
{
    [Key]
    [Column("customer_id")]
    public int CustomerId { get; set; }

    [Column("user_name")]
    [MaxLength(255)]
    public string UserName { get; set; } = string.Empty;

    [Column("first_name")]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Column("last_name")]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Column("phone")]
    [MaxLength(20)]
    public string? Phone { get; set; }

    [Column("gender")]
    [MaxLength(10)]
    public string Gender { get; set; } = "Other";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("UserName")]
    public User User { get; set; } = null!;
    public ICollection<Cart> Carts { get; set; } = new List<Cart>();
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}

// ============================================================
// PHẦN 3: SẢN PHẨM & BIẾN THỂ KÍCH CỠ
// ============================================================
[Table("category")]
public class Category
{
    [Key]
    [Column("category_id")]
    public int CategoryId { get; set; }

    [Column("category_name")]
    [MaxLength(255)]
    public string CategoryName { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    // Navigation
    public ICollection<Product> Products { get; set; } = new List<Product>();
}

[Table("size")]
public class Size
{
    [Key]
    [Column("size_id")]
    public int SizeId { get; set; }

    [Column("size_name")]
    [MaxLength(50)]
    public string SizeName { get; set; } = string.Empty;

    // Navigation
    public ICollection<ProductSize> ProductSizes { get; set; } = new List<ProductSize>();
}

[Table("product")]
public class Product
{
    [Key]
    [Column("product_id")]
    public int ProductId { get; set; }

    [Column("product_name")]
    [MaxLength(255)]
    public string ProductName { get; set; } = string.Empty;

    [Column("category_id")]
    public int? CategoryId { get; set; }

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "Available";

    [Column("ingredients")]
    public string? Ingredients { get; set; }

    [Column("expiration_date")]
    public string? ExpirationDate { get; set; }

    [Column("storage_instructions")]
    public string? StorageInstructions { get; set; }

    [Column("image")]
    [MaxLength(255)]
    public string? Image { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("CategoryId")]
    public Category? Category { get; set; }
    public ICollection<ProductSize> ProductSizes { get; set; } = new List<ProductSize>();
}

[Table("product_sizes")]
public class ProductSize
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("product_id")]
    public int ProductId { get; set; }

    [Column("size_id")]
    public int SizeId { get; set; }

    [Column("price")]
    public decimal Price { get; set; }

    [Column("stock_quantity")]
    public int StockQuantity { get; set; }

    // Navigation
    [ForeignKey("ProductId")]
    public Product Product { get; set; } = null!;

    [ForeignKey("SizeId")]
    public Size Size { get; set; } = null!;
}

// ============================================================
// PHẦN 4: NHÀ CUNG CẤP & QUẢN LÝ NHẬP HÀNG
// ============================================================
[Table("suppliers")]
public class Supplier
{
    [Key]
    [Column("supplier_id")]
    public int SupplierId { get; set; }

    [Column("supplier_code")]
    [MaxLength(20)]
    public string SupplierCode { get; set; } = string.Empty;

    [Column("supplier_name")]
    [MaxLength(255)]
    public string SupplierName { get; set; } = string.Empty;

    [Column("contact_name")]
    [MaxLength(100)]
    public string? ContactName { get; set; }

    [Column("phone")]
    [MaxLength(20)]
    public string Phone { get; set; } = string.Empty;

    [Column("email")]
    [MaxLength(255)]
    public string? Email { get; set; }

    [Column("address")]
    [MaxLength(255)]
    public string? Address { get; set; }

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "Active";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<ImportReceipt> ImportReceipts { get; set; } = new List<ImportReceipt>();
}

[Table("import_receipts")]
public class ImportReceipt
{
    [Key]
    [Column("import_id")]
    public int ImportId { get; set; }

    [Column("import_code")]
    [MaxLength(20)]
    public string ImportCode { get; set; } = string.Empty;

    [Column("supplier_id")]
    public int SupplierId { get; set; }

    [Column("total_amount")]
    public decimal TotalAmount { get; set; }

    [Column("import_date")]
    public DateTime ImportDate { get; set; } = DateTime.UtcNow;

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "Completed";

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("SupplierId")]
    public Supplier Supplier { get; set; } = null!;
    public ICollection<ImportReceiptDetail> Details { get; set; } = new List<ImportReceiptDetail>();
}

[Table("import_receipt_details")]
public class ImportReceiptDetail
{
    [Column("import_id")]
    public int ImportId { get; set; }

    [Column("product_id")]
    public int ProductId { get; set; }

    [Column("size_id")]
    public int SizeId { get; set; }

    [Column("quantity")]
    public int Quantity { get; set; }

    [Column("import_price")]
    public decimal ImportPrice { get; set; }

    [Column("total_price")]
    public decimal TotalPrice { get; set; }

    [Column("note")]
    public string? Note { get; set; }

    // Navigation
    [ForeignKey("ImportId")]
    public ImportReceipt ImportReceipt { get; set; } = null!;

    [ForeignKey("ProductId")]
    public Product Product { get; set; } = null!;

    [ForeignKey("SizeId")]
    public Size Size { get; set; } = null!;
}

// ============================================================
// PHẦN 5: CHƯƠNG TRÌNH KHUYẾN MÃI
// ============================================================
[Table("promotions")]
public class Promotion
{
    [Key]
    [Column("promotion_id")]
    public int PromotionId { get; set; }

    [Column("promotion_code")]
    [MaxLength(50)]
    public string PromotionCode { get; set; } = string.Empty;

    [Column("promotion_name")]
    [MaxLength(255)]
    public string PromotionName { get; set; } = string.Empty;

    [Column("description")]
    public string? Description { get; set; }

    [Column("start_date")]
    public DateTime StartDate { get; set; }

    [Column("end_date")]
    public DateTime EndDate { get; set; }

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "Active";

    [Column("usage_limit_per_user")]
    public int UsageLimitPerUser { get; set; } = 1;

    [Column("total_usage_limit")]
    public int? TotalUsageLimit { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<InvoicePromotion> InvoicePromotions { get; set; } = new List<InvoicePromotion>();
}

[Table("invoice_promotions")]
public class InvoicePromotion
{
    [Column("promotion_id")]
    public int PromotionId { get; set; }

    [Column("min_order_value")]
    public decimal MinOrderValue { get; set; }

    [Column("discount_percentage")]
    public decimal DiscountPercentage { get; set; }

    [Column("max_discount_value")]
    public decimal? MaxDiscountValue { get; set; }

    // Navigation
    [ForeignKey("PromotionId")]
    public Promotion Promotion { get; set; } = null!;
}

// ============================================================
// PHẦN 6: GIỎ HÀNG & ĐƠN HÀNG
// ============================================================
[Table("cart")]
public class Cart
{
    [Key]
    [Column("cart_id")]
    public int CartId { get; set; }

    [Column("customer_id")]
    public int CustomerId { get; set; }

    [Column("product_id")]
    public int ProductId { get; set; }

    [Column("size_id")]
    public int SizeId { get; set; }

    [Column("quantity")]
    public int Quantity { get; set; }

    [Column("added_at")]
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("CustomerId")]
    public Customer Customer { get; set; } = null!;

    [ForeignKey("ProductId")]
    public Product Product { get; set; } = null!;

    [ForeignKey("SizeId")]
    public Size Size { get; set; } = null!;
}

[Table("orders")]
public class Order
{
    [Key]
    [Column("order_id")]
    public int OrderId { get; set; }

    [Column("order_code")]
    [MaxLength(20)]
    public string? OrderCode { get; set; }

    [Column("customer_id")]
    public int CustomerId { get; set; }

    [Column("recipient_name")]
    [MaxLength(100)]
    public string RecipientName { get; set; } = string.Empty;

    [Column("recipient_phone")]
    [MaxLength(20)]
    public string RecipientPhone { get; set; } = string.Empty;

    [Column("pickup_time")]
    public DateTime? PickupTime { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("promotion_id")]
    public int? PromotionId { get; set; }

    [Column("discount_amount")]
    public decimal DiscountAmount { get; set; }

    [Column("total_quantity")]
    public int TotalQuantity { get; set; } = 1;

    [Column("total_cost")]
    public decimal TotalCost { get; set; }

    [Column("final_cost")]
    public decimal FinalCost { get; set; }

    [Column("payment_method")]
    [MaxLength(20)]
    public string PaymentMethod { get; set; } = "COD";

    [Column("payment_status")]
    [MaxLength(20)]
    public string PaymentStatus { get; set; } = "Unpaid";

    [Column("status")]
    [MaxLength(20)]
    public string Status { get; set; } = "Pending";

    [Column("order_date")]
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("CustomerId")]
    public Customer Customer { get; set; } = null!;

    [ForeignKey("PromotionId")]
    public Promotion? Promotion { get; set; }

    public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
    public ICollection<OrderPromotion> OrderPromotions { get; set; } = new List<OrderPromotion>();
    public ICollection<OrderStatusLog> StatusLogs { get; set; } = new List<OrderStatusLog>();
}

[Table("order_promotions")]
public class OrderPromotion
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("order_id")]
    public int OrderId { get; set; }

    [Column("promotion_id")]
    public int PromotionId { get; set; }

    [Column("discount_amount")]
    public decimal DiscountAmount { get; set; }

    [Column("applied_at")]
    public DateTime AppliedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("OrderId")]
    public Order Order { get; set; } = null!;

    [ForeignKey("PromotionId")]
    public Promotion Promotion { get; set; } = null!;
}

[Table("order_detail")]
public class OrderDetail
{
    [Column("order_id")]
    public int OrderId { get; set; }

    [Column("product_id")]
    public int ProductId { get; set; }

    [Column("size_id")]
    public int SizeId { get; set; }

    [Column("quantity")]
    public int Quantity { get; set; }

    [Column("price")]
    public decimal Price { get; set; }

    [Column("note")]
    public string? Note { get; set; }

    // Navigation
    [ForeignKey("OrderId")]
    public Order Order { get; set; } = null!;

    [ForeignKey("ProductId")]
    public Product Product { get; set; } = null!;

    [ForeignKey("SizeId")]
    public Size Size { get; set; } = null!;
}

// ============================================================
// PHẦN 7: THÔNG BÁO & LỊCH SỬ TRẠNG THÁI
// ============================================================
[Table("notifications")]
public class Notification
{
    [Key]
    [Column("notification_id")]
    public int NotificationId { get; set; }

    [Column("user_name")]
    [MaxLength(255)]
    public string UserName { get; set; } = string.Empty;

    [Column("title")]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Column("message")]
    public string Message { get; set; } = string.Empty;

    [Column("type")]
    [MaxLength(20)]
    public string Type { get; set; } = "order";

    [Column("reference_id")]
    public int? ReferenceId { get; set; }

    [Column("is_read")]
    public bool IsRead { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("UserName")]
    public User User { get; set; } = null!;
}

[Table("order_status_logs")]
public class OrderStatusLog
{
    [Key]
    [Column("log_id")]
    public int LogId { get; set; }

    [Column("order_id")]
    public int OrderId { get; set; }

    [Column("changed_by")]
    [MaxLength(100)]
    public string? ChangedBy { get; set; }

    [Column("old_status")]
    [MaxLength(20)]
    public string? OldStatus { get; set; }

    [Column("new_status")]
    [MaxLength(20)]
    public string NewStatus { get; set; } = string.Empty;

    [Column("note")]
    public string? Note { get; set; }

    [Column("changed_at")]
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("OrderId")]
    public Order Order { get; set; } = null!;
}
