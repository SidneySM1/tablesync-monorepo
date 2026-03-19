FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Hierarquia idêntica à da API
COPY ["services/reservation-worker/ReservationWorker.csproj", "services/reservation-worker/"]
COPY ["services/shared-contracts/SharedContracts.csproj", "services/shared-contracts/"]

RUN dotnet restore "services/reservation-worker/ReservationWorker.csproj"

COPY services/reservation-worker/ services/reservation-worker/
COPY services/shared-contracts/ services/shared-contracts/

WORKDIR "/src/services/reservation-worker"
RUN dotnet publish "ReservationWorker.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ReservationWorker.dll"]