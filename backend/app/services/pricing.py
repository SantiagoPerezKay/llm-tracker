"""
Tabla de precios por modelo y función para calcular el costo en USD.
Precios en USD por millón de tokens (input / output) — Abril 2025.
"""

# {model_name: {"input": $/M, "output": $/M}}
PRICING: dict[str, dict[str, float]] = {
    # ── OpenAI ────────────────────────────────────────────
    "gpt-4.1":            {"input": 2.00,  "output": 8.00},
    "gpt-4.1-mini":       {"input": 0.40,  "output": 1.60},
    "gpt-4.1-nano":       {"input": 0.10,  "output": 0.40},
    "gpt-4o":             {"input": 2.50,  "output": 10.00},
    "gpt-4o-mini":        {"input": 0.15,  "output": 0.60},
    "gpt-4-turbo":        {"input": 10.00, "output": 30.00},
    "gpt-3.5-turbo":      {"input": 0.50,  "output": 1.50},
    # ── Gemini ────────────────────────────────────────────
    "gemini-2.5-pro":     {"input": 1.25,  "output": 10.00},
    "gemini-2.5-flash":   {"input": 0.075, "output": 0.30},
    "gemini-2.0-flash":   {"input": 0.10,  "output": 0.40},
    "gemini-2.0-flash-lite": {"input": 0.075, "output": 0.30},
    "gemini-1.5-pro":     {"input": 1.25,  "output": 5.00},
    "gemini-1.5-flash":   {"input": 0.075, "output": 0.30},
    "gemini-1.0-pro":     {"input": 0.50,  "output": 1.50},
}


def calculate_cost(model: str, input_tokens: int | None, output_tokens: int | None) -> float:
    """
    Calcula el costo en USD para una llamada a un LLM.
    Devuelve 0.0 si el modelo no está en la tabla o los tokens son None.
    """
    if not input_tokens and not output_tokens:
        return 0.0

    pricing = PRICING.get(model)

    # Fallback: intentar con el nombre base (ej: "gpt-4.1-mini-2025-04-14" → "gpt-4.1-mini")
    if not pricing:
        for known_model in PRICING:
            if model.startswith(known_model):
                pricing = PRICING[known_model]
                break

    if not pricing:
        return 0.0

    inp = input_tokens or 0
    out = output_tokens or 0
    cost = (inp * pricing["input"] + out * pricing["output"]) / 1_000_000
    return round(cost, 8)


def format_cost(usd: float | None) -> str:
    """Formatea el costo para display: $0.0042 o $1.23"""
    if usd is None:
        return "—"
    if usd < 0.01:
        return f"${usd:.4f}"
    return f"${usd:.4f}"
