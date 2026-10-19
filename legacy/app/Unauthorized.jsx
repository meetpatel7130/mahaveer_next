import { useNavigate } from 'react-router-dom';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', marginTop: '10vh' }}>
      <h1>403 — Unauthorized</h1>
      <p>You do not have permission to access this page.</p>
      <button onClick={() => navigate(-1)}>Go Back</button>
    </div>
  );
}