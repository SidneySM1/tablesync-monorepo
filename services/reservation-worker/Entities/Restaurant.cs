using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ReservationWorker.Entities;

[Table("restaurants")]
public class Restaurant
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    // Relacionamento: Um restaurante tem vários setores
    public ICollection<Sector> Sectors { get; set; } = new List<Sector>();
}