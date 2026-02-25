<template>
  <div class="app-container">
    <header>
      <h1>ESP32 Configuration</h1>
      <nav>
        <router-link to="/">Dashboard</router-link>
        <router-link to="/wifi">Wi-Fi_Setup</router-link>
        <router-link to="/config">Settings</router-link>
      </nav>
    </header>
    <main>
      <router-view></router-view>
    </main>
  </div>
</template>

<style>
.app-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}
header {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  text-align: center;
}
h1 {
  margin-top: 0;
  color: #2c3e50;
}
nav {
  display: flex;
  justify-content: center;
  gap: 15px;
}
nav a {
  text-decoration: none;
  color: #3498db;
  font-weight: bold;
}
nav a.router-link-active {
  color: #2c3e50;
  border-bottom: 2px solid #2c3e50;
}
main {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
button {
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}
button:hover {
  background: #2980b9;
}
button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}
input, select {
  width: 100%;
  padding: 10px;
  margin: 8px 0;
  display: inline-block;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}
.form-group {
  margin-bottom: 15px;
}
label {
  font-weight: bold;
}
</style>
