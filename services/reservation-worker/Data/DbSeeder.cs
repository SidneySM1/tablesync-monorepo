using Microsoft.EntityFrameworkCore;
using ReservationWorker.Data;
using ReservationWorker.Entities;

namespace ReservationWorker;

public static class DbSeeder
{
	public static async Task SeedAsync(AppDbContext db)
	{
		// Limpeza para garantir um ambiente de teste isolado
		if (await db.Restaurants.AnyAsync()) return;

		var restaurante = new Restaurant { Id = Guid.NewGuid(), Name = "Tablesync Lounge & Grill" };
		await db.Restaurants.AddAsync(restaurante);

		// 1. SETORES COM REGRAS DIFERENTES
		
		// Setor 1: Pista (Boate - Sem mesas, apenas capacidade)
		var setorPista = new Sector { 
			Id = Guid.NewGuid(), 
			RestaurantId = restaurante.Id, 
			Name = "Pista (Tickets)", 
			HasMapLayout = false, 
			AllowAnyTable = false, 
			TotalCapacity = 150 
		};

		// Setor 2: Salão VIP (Com Mapa - Seleção de mesa obrigatória)
		var setorVip = new Sector { 
			Id = Guid.NewGuid(), 
			RestaurantId = restaurante.Id, 
			Name = "Salão VIP (Mapa)", 
			HasMapLayout = true, 
			AllowAnyTable = false 
		};

		// Setor 3: Deck Externo (Automático - Reserva setor, sistema aloca mesa)
		var setorDeck = new Sector { 
			Id = Guid.NewGuid(), 
			RestaurantId = restaurante.Id, 
			Name = "Deck Externo (Auto)", 
			HasMapLayout = false, 
			AllowAnyTable = true 
		};

		await db.Sectors.AddRangeAsync(setorPista, setorVip, setorDeck);

		// 2. MESAS PARA OS SETORES QUE POSSUEM INVENTÁRIO FÍSICO
		
		var mesas = new List<RestaurantTable>();

		// Mesas do VIP (Com coordenadas para o mapa)
		mesas.Add(new RestaurantTable { Id = Guid.NewGuid(), SectorId = setorVip.Id, TableNumber = 1, Capacity = 4, PositionX = 15.5, PositionY = 20.0 });
		mesas.Add(new RestaurantTable { Id = Guid.NewGuid(), SectorId = setorVip.Id, TableNumber = 2, Capacity = 2, PositionX = 40.0, PositionY = 20.0 });

		// Mesas do Deck (Sem coordenadas necessárias, pois é automático)
		for (int i = 10; i <= 15; i++)
		{
			mesas.Add(new RestaurantTable { Id = Guid.NewGuid(), SectorId = setorDeck.Id, TableNumber = i, Capacity = 4, PositionX = 0, PositionY = 0 });
		}

		await db.Tables.AddRangeAsync(mesas);

		// 3. GRADE DE HORÁRIOS (TIME SLOTS) VINCULADOS AOS SETORES
		
		var slots = new List<TimeSlot>();
		var gradePadrao = new[] { "19:00", "21:00", "23:00" };

		// Aplicando a grade para todos os setores
		foreach (var setorId in new[] { setorPista.Id, setorVip.Id, setorDeck.Id })
		{
			foreach (var hora in gradePadrao)
			{
				slots.Add(new TimeSlot { 
					Id = Guid.NewGuid(), 
					SectorId = setorId, 
					StartTime = TimeSpan.Parse(hora), 
					EndTime = TimeSpan.Parse(hora).Add(TimeSpan.FromHours(2)) 
				});
			}
		}

		await db.TimeSlots.AddRangeAsync(slots);
		await db.SaveChangesAsync();
	}
}