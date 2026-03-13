const DENTALINK_BASE_URL = "https://api.dentalink.healthatom.com/api/v1";

export class DentalinkClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${DENTALINK_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Dentalink API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async getSucursales() {
    return this.request("/sucursales");
  }

  async getProfesionales() {
    return this.request("/profesionales");
  }

  async getSillones() {
    return this.request("/sillones");
  }

  async getCitas(params: { fecha_inicio?: string; fecha_fin?: string } = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/citas${query ? `?${query}` : ""}`);
  }

  async createCita(data: unknown) {
    return this.request("/citas", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getPacientes() {
    return this.request("/pacientes");
  }

  async createPaciente(data: unknown) {
    return this.request("/pacientes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}
