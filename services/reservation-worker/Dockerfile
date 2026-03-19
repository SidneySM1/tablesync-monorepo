# Estágio de Build usando o SDK 10.0 para 2026
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# 1. Copia os ficheiros de projeto primeiro (Otimização de Cache)
# O caminho aqui considera que o contexto do 'docker-compose' é a raiz do monorepo
COPY ["services/reservation-worker/ReservationWorker.csproj", "services/reservation-worker/"]
COPY ["shared-contracts/SharedContracts.csproj", "shared-contracts/"]

# 2. Restaura as dependências do Worker
RUN dotnet restore "services/reservation-worker/ReservationWorker.csproj"

# 3. Copia o código fonte de ambos os diretórios
COPY services/reservation-worker/ services/reservation-worker/
COPY shared-contracts/ shared-contracts/

# 4. Compila e publica o Worker
WORKDIR "/src/services/reservation-worker"
RUN dotnet publish "ReservationWorker.csproj" -c Release -o /app/publish

# Estágio de Runtime com o motor do .NET 10.0
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Comando para iniciar o serviço de fila
ENTRYPOINT ["dotnet", "ReservationWorker.dll"]