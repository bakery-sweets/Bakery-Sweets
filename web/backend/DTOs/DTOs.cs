namespace WebBackend.DTOs;

// ============================================================
// Auth DTOs
// ============================================================
public record LoginRequest(string UserName, string Password);
public record RegisterRequest(string UserName, string Email, string Password, string FirstName, string LastName, string? Phone, string? Gender);
public record AuthResponse(string Token, string RefreshToken, string UserName, string Role, DateTime ExpiresAt);

// ============================================================
// Admin — User Management
// ============================================================
public record UserDto(string UserName, string Email, string Role, string Status, DateTime CreatedAt, CustomerInfoDto? Customer);
public record CustomerInfoDto(int CustomerId, string FirstName, string LastName, string? Phone, string? Gender);
public record UpdateUserStatusRequest(string Status); // "active" or "locked"
public record UpdateUserRoleRequest(string Role); // "customer" or "admin"

// ============================================================
// Admin — Product Management
// ============================================================
public record ProductDto(int ProductId, string ProductName, int? CategoryId, string? CategoryName, string Status, string? Ingredients, string? ExpirationDate, string? StorageInstructions, string? Image, DateTime CreatedAt, List<ProductSizeDto> Sizes);
public record ProductSizeDto(int Id, int SizeId, string SizeName, decimal Price, int StockQuantity);
public record CreateProductRequest(string ProductName, int CategoryId, string Status, string? Ingredients, string? ExpirationDate, string? StorageInstructions, string? Image, List<CreateProductSizeRequest> Sizes);
public record CreateProductSizeRequest(int SizeId, decimal Price, int StockQuantity);
public record UpdateProductRequest(string? ProductName, int? CategoryId, string? Status, string? Ingredients, string? ExpirationDate, string? StorageInstructions, string? Image);

// ============================================================
// Admin — Category Management
// ============================================================
public record CategoryDto(int CategoryId, string CategoryName, string? Description, int ProductCount);
public record CreateCategoryRequest(string CategoryName, string? Description);
public record UpdateCategoryRequest(string? CategoryName, string? Description);

// ============================================================
// Admin — Size Management
// ============================================================
public record SizeDto(int SizeId, string SizeName);
public record CreateSizeRequest(string SizeName);

// ============================================================
// Admin — Supplier Management
// ============================================================
public record SupplierDto(int SupplierId, string SupplierCode, string SupplierName, string? ContactName, string Phone, string? Email, string? Address, string Status, DateTime CreatedAt);
public record CreateSupplierRequest(string SupplierCode, string SupplierName, string? ContactName, string Phone, string? Email, string? Address);
public record UpdateSupplierRequest(string? SupplierName, string? ContactName, string? Phone, string? Email, string? Address, string? Status);

// ============================================================
// Admin — Import Receipt Management
// ============================================================
public record ImportReceiptDto(int ImportId, string ImportCode, int SupplierId, string SupplierName, decimal TotalAmount, DateTime ImportDate, string Status, string? Notes, List<ImportReceiptDetailDto> Details);
public record ImportReceiptDetailDto(int ProductId, string ProductName, int SizeId, string SizeName, int Quantity, decimal ImportPrice, decimal TotalPrice, string? Note);
public record CreateImportReceiptRequest(string ImportCode, int SupplierId, string? Notes, List<CreateImportDetailRequest> Details);
public record CreateImportDetailRequest(int ProductId, int SizeId, int Quantity, decimal ImportPrice, string? Note);

// ============================================================
// Admin — Promotion Management
// ============================================================
public record PromotionDto(int PromotionId, string PromotionCode, string PromotionName, string? Description, DateTime StartDate, DateTime EndDate, string Status, int UsageLimitPerUser, int? TotalUsageLimit, List<InvoicePromotionDto> Tiers);
public record InvoicePromotionDto(decimal MinOrderValue, decimal DiscountPercentage, decimal? MaxDiscountValue);
public record CreatePromotionRequest(string PromotionCode, string PromotionName, string? Description, DateTime StartDate, DateTime EndDate, int UsageLimitPerUser, int? TotalUsageLimit, List<CreateInvoicePromotionRequest> Tiers);
public record CreateInvoicePromotionRequest(decimal MinOrderValue, decimal DiscountPercentage, decimal? MaxDiscountValue);
public record UpdatePromotionRequest(string? PromotionName, string? Description, DateTime? StartDate, DateTime? EndDate, string? Status, int? UsageLimitPerUser, int? TotalUsageLimit);

// ============================================================
// Admin — Order Management
// ============================================================
public record OrderDto(int OrderId, string? OrderCode, int CustomerId, string CustomerName, string RecipientName, string RecipientPhone, DateTime? PickupTime, string? Notes, decimal DiscountAmount, int TotalQuantity, decimal TotalCost, decimal FinalCost, string PaymentMethod, string PaymentStatus, string Status, DateTime OrderDate, List<OrderDetailDto> Details);
public record OrderDetailDto(int ProductId, string ProductName, int SizeId, string SizeName, int Quantity, decimal Price, string? Note);
public record UpdateOrderStatusRequest(string Status, string? Note);

// ============================================================
// Admin — Statistics
// ============================================================
public record StatisticsOverviewDto(decimal TotalRevenue, int TotalOrders, int TotalCustomers, int TotalProducts);
public record BestSellerDto(int ProductId, string ProductName, int TotalQuantity);

// ============================================================
// Client — Cart
// ============================================================
public record CartItemDto(int CartId, int ProductId, string ProductName, string? ProductImage, int SizeId, string SizeName, decimal Price, int Quantity, decimal Subtotal);
public record AddToCartRequest(int ProductId, int SizeId, int Quantity);
public record UpdateCartRequest(int Quantity);

// ============================================================
// Client — Place Order
// ============================================================
public record PlaceOrderRequest(string RecipientName, string RecipientPhone, DateTime? PickupTime, string? Notes, string? PromotionCode, string PaymentMethod);

// ============================================================
// Client — Notification
// ============================================================
public record NotificationDto(int NotificationId, string Title, string Message, string Type, int? ReferenceId, bool IsRead, DateTime CreatedAt);

// ============================================================
// Pagination
// ============================================================
public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize, int TotalPages);
