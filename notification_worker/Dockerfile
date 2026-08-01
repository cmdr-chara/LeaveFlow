FROM elixir:1.20.2-otp-28 AS build
WORKDIR /app
RUN mix local.hex --force && mix local.rebar --force
COPY notification_worker/mix.exs notification_worker/mix.lock ./
RUN MIX_ENV=prod mix deps.get --only prod && MIX_ENV=prod mix deps.compile
COPY notification_worker/lib ./lib
RUN MIX_ENV=prod mix compile

FROM elixir:1.20.2-otp-28
WORKDIR /app
ENV MIX_ENV=prod
COPY --from=build /app/_build ./_build
COPY --from=build /app/deps ./deps
COPY --from=build /app/mix.exs ./mix.exs
COPY --from=build /app/mix.lock ./mix.lock
CMD ["mix", "run", "--no-halt"]
