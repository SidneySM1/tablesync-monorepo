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

        // 3. Criar as Mesas (Varanda e Salão Principal)
        var mesas = new List<RestaurantTable>
        {
            // MESAS DA VARANDA (Com posições X e Y para o mapa)
            new() { Id = Guid.NewGuid(), SectorId = varandaId, TableNumber = 1, Capacity = 2, PositionX = 10.5, PositionY = 20.0 },
            new() { Id = Guid.NewGuid(), SectorId = varandaId, TableNumber = 2, Capacity = 2, PositionX = 10.5, PositionY = 40.0 },
            new() { Id = Guid.NewGuid(), SectorId = varandaId, TableNumber = 3, Capacity = 4, PositionX = 50.0, PositionY = 30.0 },
            new() { Id = Guid.NewGuid(), SectorId = varandaId, TableNumber = 4, Capacity = 4, PositionX = 50.0, PositionY = 60.0 },
            new() { Id = Guid.NewGuid(), SectorId = varandaId, TableNumber = 5, Capacity = 8, PositionX = 80.0, PositionY = 45.0 }, // Mesão da família

            // MESAS DO SALÃO PRINCIPAL (X e Y são zero, pois não aparecem no mapa, mas existem fisicamente)
            new() { Id = Guid.NewGuid(), SectorId = salaoId, TableNumber = 10, Capacity = 2, PositionX = 0, PositionY = 0 },
            new() { Id = Guid.NewGuid(), SectorId = salaoId, TableNumber = 11, Capacity = 4, PositionX = 0, PositionY = 0 },
            new() { Id = Guid.NewGuid(), SectorId = salaoId, TableNumber = 12, Capacity = 6, PositionX = 0, PositionY = 0 },
            new() { Id = Guid.NewGuid(), SectorId = salaoId, TableNumber = 13, Capacity = 10, PositionX = 0, PositionY = 0 }
        };

        db.RestaurantTables.AddRange(mesas);

        // 4. Criar os Horários (Time Slots) para CADA mesa (Varanda e Salão)
        var slots = new List<TimeSlot>();
        
        foreach (var mesa in mesas)
        {
            // Padrão: 18:00 às 20:00 e 20:00 às 22:00
            slots.Add(new TimeSlot { Id = Guid.NewGuid(), RestaurantTableId = mesa.Id, StartTime = new TimeSpan(18, 0, 0), EndTime = new TimeSpan(20, 0, 0) });
            slots.Add(new TimeSlot { Id = Guid.NewGuid(), RestaurantTableId = mesa.Id, StartTime = new TimeSpan(20, 0, 0), EndTime = new TimeSpan(22, 0, 0) });
            
            // A Mesa 5 (Varanda) e a Mesa 13 (Salão) têm um horário especial VIP mais tarde
            if (mesa.TableNumber == 5 || mesa.TableNumber == 13)
            {
                slots.Add(new TimeSlot { Id = Guid.NewGuid(), RestaurantTableId = mesa.Id, StartTime = new TimeSpan(22, 30, 0), EndTime = new TimeSpan(23, 59, 0) });
            }
        }

        db.TimeSlots.AddRange(slots);

        // Salvar tudo de uma vez no banco
        await db.SaveChangesAsync();
    }
}