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

