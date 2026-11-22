import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export const ShortLinkRedirect: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { services, showToast } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!serviceId) {
      navigate('/services', { replace: true });
      return;
    }

    const clean = serviceId.trim().toUpperCase();
    const service = services.find(
      (s) =>
        s?.serviceId?.toUpperCase() === clean ||
        s?.slug?.toUpperCase() === clean ||
        s?.id?.toUpperCase() === clean
    );

    if (service) {
      navigate(`/services/${service.slug || service.id}`, { replace: true });
    } else {
      showToast('Service Not Found', `No service matches ID ${serviceId}`, 'error');
      navigate('/services', { replace: true });
    }
  }, [serviceId, services, navigate]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-xs font-mono text-cyan-400">
      Routing permanent Service ID {serviceId}...
    </div>
  );
};

export const DirectOrderRedirect: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const { services } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!serviceId) {
      navigate('/request', { replace: true });
      return;
    }

    const clean = serviceId.trim().toUpperCase();
    const service = services.find(
      (s) =>
        s?.serviceId?.toUpperCase() === clean ||
        s?.slug?.toUpperCase() === clean ||
        s?.id?.toUpperCase() === clean
    );

    const targetId = service ? (service.id || service.slug || service.serviceId) : serviceId;
    navigate(`/request/${targetId}${window.location.search}`, { replace: true });
  }, [serviceId, services, navigate]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-xs font-mono text-cyan-400">
      Opening direct order form for {serviceId}...
    </div>
  );
};
