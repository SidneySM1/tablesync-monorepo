using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ReservationWorker.Entities;

[Table("sectors")]
public class Sector
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("restaurant_id")]
    public Guid RestaurantId { get; set; }
    public Restaurant? Restaurant { get; set; }

    [Required]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("has_map_layout")]
    public bool HasMapLayout { get; set; }

    [Column("allow_any_table")]
    public bool AllowAnyTable { get; set; }

    // Relacionamento: Um setor tem várias mesas
    public ICollection<RestaurantTable> Tables { get; set; } = new List<RestaurantTable>();
}