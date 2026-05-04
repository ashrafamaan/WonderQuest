import React, { useState } from 'react';
import * as api from '../api';

export function AuthScreen({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (username.trim() === '') throw new Error('Username is required');
      if (password.trim() === '') throw new Error('Password is required');

      let res;
      if (isLogin) {
        res = await api.login(username, password);
      } else {
        res = await api.register(username, password);
      }
      
      localStorage.setItem('token', res.token);
      onLogin(res.user);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await api.loginGuest();
      localStorage.setItem('token', res.token);
      onLogin(res.user);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3em', marginBottom: '10px', color: 'var(--text-color)' }}>WonderQuest</h1>
      <p style={{ fontSize: '1.2em', marginBottom: '30px', opacity: 0.8, color: 'var(--text-color)' }}>Your Magical AI Learning Companion</p>
      
      <div className="modal-content" style={{ width: '100%', maxWidth: '400px', padding: '30px' }}>
        <h2>{isLogin ? 'Welcome Back!' : 'Create an Account'}</h2>
        
        {error && <div style={{ background: '#e74c3c', color: 'white', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color-alpha)', background: 'rgba(0,0,0,0.1)', color: 'inherit', fontSize: '1em' }}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color-alpha)', background: 'rgba(0,0,0,0.1)', color: 'inherit', fontSize: '1em' }}
          />
          <button type="submit" disabled={isLoading} className="modal-btn" style={{ padding: '12px', fontSize: '1.1em' }}>
            {isLoading ? 'Loading...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <p style={{ marginBottom: '15px' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span 
            style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </span>
        </p>

        <hr style={{ border: '1px solid var(--border-color-alpha)', marginBottom: '15px' }} />

        <button 
          onClick={handleGuest} 
          disabled={isLoading}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid var(--primary-color)', background: 'transparent', color: 'var(--primary-color)', fontSize: '1em', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Continue as Guest
        </button>
      </div>
    </div>
  );
}
