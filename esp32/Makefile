build:
	@echo "Building ESP32 Vue Project..."
	@cd frontend && bun run build
	@echo "cleaning old firmware build..."
	@rm -rf firmware/.pio/build/esp32-s3-devkitc-1
	@platformio run --environment esp32-s3-devkitc-1 --project-dir firmware
	@echo "Flashing ESP32..."
	@platformio run --environment esp32-s3-devkitc-1 --target upload --project-dir firmware
	@platformio run --environment esp32-s3-devkitc-1 --target uploadfs --project-dir firmware
	@echo "Build completed!"

serial-log:
	@mkdir -p logs
	@logfile="logs/serial-$$(date +%Y%m%d-%H%M%S).log"; \
		echo "Streaming serial output to $$logfile"; \
		platformio device monitor --project-dir firmware --environment esp32-s3-devkitc-1 | tee "$$logfile"
