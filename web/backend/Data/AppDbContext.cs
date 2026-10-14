using Microsoft.EntityFrameworkCore;

namespace WebBackend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // ============================================================
    // DbSets
    // ============================================================
    public DbSet<Models.User> Users => Set<Models.User>();
    public DbSet<Models.Customer> Customers => Set<Models.Customer>();
    public DbSet<Models.Category> Categories => Set<Models.Category>();
    public DbSet<Models.Size> Sizes => Set<Models.Size>();
    public DbSet<Models.Product> Products => Set<Models.Product>();
    public DbSet<Models.ProductSize> ProductSizes => Set<Models.ProductSize>();
    public DbSet<Models.Supplier> Suppliers => Set<Models.Supplier>();
    public DbSet<Models.ImportReceipt> ImportReceipts => Set<Models.ImportReceipt>();
    public DbSet<Models.ImportReceiptDetail> ImportReceiptDetails => Set<Models.ImportReceiptDetail>();
    public DbSet<Models.Promotion> Promotions => Set<Models.Promotion>();
    public DbSet<Models.InvoicePromotion> InvoicePromotions => Set<Models.InvoicePromotion>();
    public DbSet<Models.Cart> Carts => Set<Models.Cart>();
    public DbSet<Models.Order> Orders => Set<Models.Order>();
    public DbSet<Models.OrderPromotion> OrderPromotions => Set<Models.OrderPromotion>();
    public DbSet<Models.OrderDetail> OrderDetails => Set<Models.OrderDetail>();
    public DbSet<Models.Notification> Notifications => Set<Models.Notification>();
    public DbSet<Models.OrderStatusLog> OrderStatusLogs => Set<Models.OrderStatusLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ============================================================
        // Composite Keys
        // ============================================================
        modelBuilder.Entity<Models.ImportReceiptDetail>()
            .HasKey(e => new { e.ImportId, e.ProductId, e.SizeId });

        modelBuilder.Entity<Models.InvoicePromotion>()
            .HasKey(e => new { e.PromotionId, e.MinOrderValue });

        modelBuilder.Entity<Models.OrderDetail>()
            .HasKey(e => new { e.OrderId, e.ProductId, e.SizeId });

        // ============================================================
        // Unique Constraints
        // ============================================================
        modelBuilder.Entity<Models.User>()
            .HasIndex(u => u.Email).IsUnique();

        modelBuilder.Entity<Models.Customer>()
            .HasIndex(c => c.Phone).IsUnique();

        modelBuilder.Entity<Models.Category>()
            .HasIndex(c => c.CategoryName).IsUnique();

        modelBuilder.Entity<Models.Size>()
            .HasIndex(s => s.SizeName).IsUnique();

        modelBuilder.Entity<Models.ProductSize>()
            .HasIndex(ps => new { ps.ProductId, ps.SizeId }).IsUnique();

        modelBuilder.Entity<Models.Supplier>()
            .HasIndex(s => s.SupplierCode).IsUnique();

        modelBuilder.Entity<Models.Supplier>()
            .HasIndex(s => s.Phone).IsUnique();

        modelBuilder.Entity<Models.ImportReceipt>()
            .HasIndex(ir => ir.ImportCode).IsUnique();

        modelBuilder.Entity<Models.Promotion>()
            .HasIndex(p => p.PromotionCode).IsUnique();

        modelBuilder.Entity<Models.Order>()
            .HasIndex(o => o.OrderCode).IsUnique();

        // ============================================================
        // Relationships
        // ============================================================
        modelBuilder.Entity<Models.User>()
            .HasOne(u => u.Customer)
            .WithOne(c => c.User)
            .HasForeignKey<Models.Customer>(c => c.Phone);

        modelBuilder.Entity<Models.Product>()
            .HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Models.Order>()
            .HasOne(o => o.Promotion)
            .WithMany()
            .HasForeignKey(o => o.PromotionId)
            .OnDelete(DeleteBehavior.SetNull);

        // ============================================================
        // Decimal Precision
        // ============================================================
        modelBuilder.Entity<Models.ProductSize>()
            .Property(ps => ps.Price).HasPrecision(15, 2);

        modelBuilder.Entity<Models.ImportReceiptDetail>()
            .Property(d => d.ImportPrice).HasPrecision(15, 2);

        modelBuilder.Entity<Models.ImportReceiptDetail>()
            .Property(d => d.TotalPrice).HasPrecision(20, 2);

        modelBuilder.Entity<Models.ImportReceipt>()
            .Property(ir => ir.TotalAmount).HasPrecision(20, 2);

        modelBuilder.Entity<Models.InvoicePromotion>()
            .Property(ip => ip.MinOrderValue).HasPrecision(15, 2);

        modelBuilder.Entity<Models.InvoicePromotion>()
            .Property(ip => ip.DiscountPercentage).HasPrecision(5, 2);

        modelBuilder.Entity<Models.InvoicePromotion>()
            .Property(ip => ip.MaxDiscountValue).HasPrecision(15, 2);

        modelBuilder.Entity<Models.Order>()
            .Property(o => o.DiscountAmount).HasPrecision(15, 2);

        modelBuilder.Entity<Models.Order>()
            .Property(o => o.TotalCost).HasPrecision(20, 2);

        modelBuilder.Entity<Models.Order>()
            .Property(o => o.FinalCost).HasPrecision(20, 2);

        modelBuilder.Entity<Models.OrderPromotion>()
            .Property(op => op.DiscountAmount).HasPrecision(15, 2);

        modelBuilder.Entity<Models.OrderDetail>()
            .Property(od => od.Price).HasPrecision(15, 2);
    }
}
