from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/ask/', views.ask, name='ask'),
    path('offline/', views.offline, name='offline'),
    path('manifest.json', views.manifest, name='manifest'),
    path('sw.js', views.service_worker, name='sw'),
]