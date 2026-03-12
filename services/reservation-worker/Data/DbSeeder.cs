using Microsoft.EntityFrameworkCore;
using ReservationWorker.Entities;

namespace ReservationWorker.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        // Se já tiver um restaurante, não fazemos nada. O banco já está populado.
        if (await db.Restaurants.AnyAsync()) return;

        // 1. Criar o Restaurante
        var restaurant = new Restaurant
        {
            Id = Guid.NewGuid(),
            Name = "TableSync Beira Mar"
        };
        db.Restaurants.Add(restaurant);

        // 2. Criar os Setores (Um com mapa visual, outro só com "Qualquer Mesa")
        var varandaId = Guid.NewGuid();
        var varanda = new Sector
        {
            Id = varandaId,
            RestaurantId = restaurant.Id,
            Name = "Varanda (Vista Mar)",
            HasMapLayout = true,
            AllowAnyTable = false // Na varanda, você OBRIGATORIAMENTE escolhe a mesa
        };

        var salaoId = Guid.NewGuid();
        var salaoInterno = new Sector
        {
            Id = salaoId,
            RestaurantId = restaurant.Id,
            Name = "Salão Principal",
            HasMapLayout = false,
            AllowAnyTable = true // Aqui, o garçom te acomoda (Mesa Qualquer)
        };
        
        db.Sectors.AddRange(varanda, salaoInterno);

        // 3. Criar as Mesas (Apenas na Varanda, como exemplo)
        // Usamos porcentagens (0.0 a 100.0) para PositionX e Y para ficar fácil no frontend
        var mesas = new List<RestaurantTable>
        {
            new() { Id = Guid.NewGuid(), SectorId = varandaId, TableNumber = 1, Capacity = 2, PositionX = 10.5, PositionY = 20.0 },
            new() { Id = Guid.NewGuid(), SectorId = varandaId, TableNumber = 2, Capacity = 2, PositionX = 10.5, PositionY = 40.0 },
            new() { Id = Guid.NewGuid(), SectorId = varandaId, TableNumber = 3, Capacity = 4, PositionX = 50.0, PositionY = 30.0 },
            new() { Id = Guid.NewGuid(), SectorId = varandaId, TableNumber = 4, Capacity = 4, PositionX = 50.0, PositionY = 60.0 },
            new() { Id = Guid.NewGuid(), SectorId = varandaId, TableNumber = 5, Capacity = 8, PositionX = 80.0, PositionY = 45.0 } // Mesão da família
        };

        db.RestaurantTables.AddRange(mesas);

        // Salvar tudo de uma vez no banco
        await db.SaveChangesAsync();
    }
}