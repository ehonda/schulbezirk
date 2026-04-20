import 'leaflet/dist/leaflet.css';
import './style.css';

import L from 'leaflet';

import { DEFAULT_SCHOOL_ID, OFFICIAL_SO1_MAP_URL } from './config';
import { loadAppData } from './data';
import { pointInFeature } from './geometry';
import { MapTilerGeocoder } from './geocoder';
import type {
  CheckResult,
  DistrictFeature,
  PointSelection,
  SchoolData,
  SearchCandidate
} from './types';

interface AppElements {
  searchForm: HTMLFormElement;
  schoolSelect: HTMLSelectElement;
  addressInput: HTMLInputElement;
  searchButton: HTMLButtonElement;
  searchStatus: HTMLParagraphElement;
  candidatePanel: HTMLElement;
  candidateList: HTMLDivElement;
  resultPanel: HTMLDivElement;
  resultJson: HTMLPreElement;
  clearSelectionButton: HTMLButtonElement;
  districtTitle: HTMLHeadingElement;
  apiKeyInput: HTMLInputElement;
  saveKeyButton: HTMLButtonElement;
  removeKeyButton: HTMLButtonElement;
  keyStatus: HTMLParagraphElement;
}

function getElements(): AppElements {
  return {
    searchForm: document.querySelector('#search-form') as HTMLFormElement,
    schoolSelect: document.querySelector('#school-select') as HTMLSelectElement,
    addressInput: document.querySelector('#address-input') as HTMLInputElement,
    searchButton: document.querySelector('#search-button') as HTMLButtonElement,
    searchStatus: document.querySelector('#search-status') as HTMLParagraphElement,
    candidatePanel: document.querySelector('#candidate-panel') as HTMLElement,
    candidateList: document.querySelector('#candidate-list') as HTMLDivElement,
    resultPanel: document.querySelector('#result-panel') as HTMLDivElement,
    resultJson: document.querySelector('#result-json') as HTMLPreElement,
    clearSelectionButton: document.querySelector(
      '#clear-selection-button'
    ) as HTMLButtonElement,
    districtTitle: document.querySelector('#district-title') as HTMLHeadingElement,
    apiKeyInput: document.querySelector('#api-key-input') as HTMLInputElement,
    saveKeyButton: document.querySelector('#save-key-button') as HTMLButtonElement,
    removeKeyButton: document.querySelector(
      '#remove-key-button'
    ) as HTMLButtonElement,
    keyStatus: document.querySelector('#key-status') as HTMLParagraphElement
  };
}

function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

function createPinIcon(kind: 'user'): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span class="pin pin--${kind}"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26]
  });
}

class SchulbezirkApp {
  private readonly elements = getElements();

  private readonly geocoder = new MapTilerGeocoder();

  private readonly schoolLayer = L.layerGroup();

  private readonly map = L.map('map', {
    zoomControl: true,
    minZoom: 11
  });

  private schools: SchoolData[] = [];

  private districts = new Map<string, DistrictFeature>();

  private selectedSchoolId = DEFAULT_SCHOOL_ID;

  private districtLayer?: L.GeoJSON;

  private selectionMarker?: L.Marker;

  private currentSelection?: PointSelection;

  private reverseLookupToken = 0;

  async init(): Promise<void> {
    this.initializeMap();
    this.attachEventHandlers();

    const { schools, districts } = await loadAppData();
    this.schools = schools;
    this.districts = districts;

    if (!this.schools.find((school) => school.id === this.selectedSchoolId)) {
      this.selectedSchoolId = this.schools[0]?.id ?? '';
    }

    this.populateSchoolOptions();
    this.renderDistrict();
    this.renderSchoolMarkers();
    this.renderKeyStatus();
    this.updateSearchAvailability();
  }

  private initializeMap(): void {
    this.map.setView([51.3397, 12.3905], 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);

    this.schoolLayer.addTo(this.map);
    this.map.on('click', (event) => {
      void this.setManualSelection(
        event.latlng.lat,
        event.latlng.lng,
        'Manuell gesetzter Pin'
      );
    });
  }

  private attachEventHandlers(): void {
    this.elements.searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.handleSearch();
    });

    this.elements.schoolSelect.addEventListener('change', () => {
      this.selectedSchoolId = this.elements.schoolSelect.value;
      this.renderDistrict();
      this.renderSchoolMarkers();
      this.renderCurrentResult();
    });

    this.elements.clearSelectionButton.addEventListener('click', () => {
      this.clearSelection();
    });

    this.elements.saveKeyButton.addEventListener('click', () => {
      if (!this.elements.apiKeyInput.value.trim()) {
        this.elements.keyStatus.textContent =
          'Bitte zuerst einen gültigen MapTiler-Schlüssel eingeben.';
        return;
      }

      this.geocoder.saveRuntimeKey(this.elements.apiKeyInput.value);
      this.elements.apiKeyInput.value = '';
      this.renderKeyStatus();
      this.updateSearchAvailability();
    });

    this.elements.removeKeyButton.addEventListener('click', () => {
      this.geocoder.clearRuntimeKey();
      this.renderKeyStatus();
      this.updateSearchAvailability();
    });
  }

  private get selectedSchool(): SchoolData {
    const match = this.schools.find((school) => school.id === this.selectedSchoolId);

    if (!match) {
      throw new Error(`Unknown school id: ${this.selectedSchoolId}`);
    }

    return match;
  }

  private get selectedDistrict(): DistrictFeature {
    const district = this.districts.get(this.selectedSchool.districtId);

    if (!district) {
      throw new Error(`Unknown district id: ${this.selectedSchool.districtId}`);
    }

    return district;
  }

  private populateSchoolOptions(): void {
    this.elements.schoolSelect.replaceChildren(
      ...this.schools.map((school) => {
        const option = document.createElement('option');
        option.value = school.id;
        option.textContent = school.name;
        option.selected = school.id === this.selectedSchoolId;
        return option;
      })
    );
  }

  private renderDistrict(): void {
    const district = this.selectedDistrict;

    this.elements.districtTitle.textContent = `${district.properties.name} (${district.properties.districtId})`;

    if (this.districtLayer) {
      this.districtLayer.remove();
    }

    this.districtLayer = L.geoJSON(district, {
      style: {
        color: '#d94841',
        weight: 3,
        fillColor: '#ffb17a',
        fillOpacity: 0.33
      }
    }).addTo(this.map);

    this.map.fitBounds(this.districtLayer.getBounds().pad(0.1));
  }

  private renderSchoolMarkers(): void {
    const selectedDistrictId = this.selectedDistrict.properties.districtId;
    this.schoolLayer.clearLayers();

    this.schools
      .filter((school) => school.districtId === selectedDistrictId)
      .forEach((school) => {
        const marker = L.circleMarker([school.latitude, school.longitude], {
          radius: school.id === this.selectedSchoolId ? 9 : 7,
          color: '#16324f',
          fillColor: school.id === this.selectedSchoolId ? '#ffd166' : '#f6f1de',
          fillOpacity: 1,
          weight: 2
        });

        marker.bindPopup(
          `<strong>${school.name}</strong><br>${school.address}<br><a href="${school.sourceUrl}" target="_blank" rel="noreferrer">Schulquelle</a>`
        );
        marker.addTo(this.schoolLayer);
      });
  }

  private renderKeyStatus(): void {
    if (this.geocoder.runtimeKey) {
      this.elements.keyStatus.textContent =
        'Schlüssel lokal gespeichert. Die Adresssuche ist aktiv.';
      return;
    }

    this.elements.keyStatus.textContent =
      'Noch kein Schlüssel gespeichert. Ohne Schlüssel funktioniert weiter die manuelle Pin-Platzierung.';
  }

  private updateSearchAvailability(): void {
    this.renderSearchHint();
  }

  private renderSearchHint(): void {
    this.elements.searchStatus.textContent = this.geocoder.isConfigured
      ? 'Adresse eingeben oder direkt einen Punkt auf der Karte setzen.'
      : 'MapTiler-Schlüssel eingeben oder direkt in die Karte klicken.';
  }

  private async handleSearch(): Promise<void> {
    const query = this.elements.addressInput.value.trim();

    if (!query) {
      this.elements.searchStatus.textContent = 'Bitte zuerst eine Adresse eingeben.';
      return;
    }

    if (!this.geocoder.isConfigured) {
      this.elements.searchStatus.textContent =
        'Bitte zuerst einen MapTiler-Schlüssel eingeben oder direkt in die Karte klicken.';
      this.elements.apiKeyInput.focus();
      return;
    }

    this.elements.searchStatus.textContent = 'Adresse wird gesucht...';
    this.renderCandidates([]);

    try {
      const candidates = await this.geocoder.search(query);

      if (!candidates.length) {
        this.elements.searchStatus.textContent =
          'Keine passenden Treffer in Leipzig gefunden.';
        this.hideCandidates();
        return;
      }

      if (candidates.length === 1) {
        this.elements.searchStatus.textContent = 'Ein eindeutiger Treffer wurde gefunden.';
        this.applyCandidate(query, candidates[0]);
        return;
      }

      this.elements.searchStatus.textContent =
        'Mehrere Treffer gefunden. Bitte den passenden Treffer auswählen.';
      this.renderCandidates(candidates, query);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unbekannter Geocoding-Fehler';
      this.elements.searchStatus.textContent = `Adresssuche fehlgeschlagen: ${message}`;
    }
  }

  private renderCandidates(candidates: SearchCandidate[], query?: string): void {
    this.elements.candidateList.replaceChildren();

    if (!candidates.length) {
      this.hideCandidates();
      return;
    }

    this.elements.candidatePanel.classList.remove('candidate-panel--hidden');
    this.elements.candidateList.className = 'candidate-list';

    candidates.forEach((candidate) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'candidate';
      button.innerHTML = `
        <strong>${candidate.label}</strong>
        <span>Typ: ${candidate.matchType}</span>
        <span>${formatCoordinate(candidate.latitude)}, ${formatCoordinate(candidate.longitude)}</span>
      `;
      button.addEventListener('click', () => {
        this.applyCandidate(query ?? candidate.label, candidate);
      });
      this.elements.candidateList.appendChild(button);
    });

    const firstCandidate = this.elements.candidateList.querySelector(
      'button'
    ) as HTMLButtonElement | null;
    firstCandidate?.focus();
    this.elements.candidatePanel.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }

  private hideCandidates(): void {
    this.elements.candidatePanel.classList.add('candidate-panel--hidden');
    this.elements.candidateList.className = 'candidate-list';
    this.elements.candidateList.replaceChildren();
  }

  private applyCandidate(query: string, candidate: SearchCandidate): void {
    void this.setSelection({
      query,
      normalizedAddress: candidate.label,
      lat: candidate.latitude,
      lon: candidate.longitude,
      resolutionMethod: 'geocoded'
    });
  }

  private async setManualSelection(
    lat: number,
    lon: number,
    queryLabel: string
  ): Promise<void> {
    const fallbackLabel = `Pin bei ${formatCoordinate(lat)}, ${formatCoordinate(lon)}`;

    this.setSelection({
      query: queryLabel,
      normalizedAddress: fallbackLabel,
      lat,
      lon,
      resolutionMethod: 'manual-pin'
    });

    if (!this.geocoder.isConfigured) {
      return;
    }

    const lookupToken = this.reverseLookupToken;

    try {
      const resolvedLabel = await this.geocoder.reverse(lon, lat);

      if (
        lookupToken === this.reverseLookupToken &&
        this.currentSelection?.resolutionMethod === 'manual-pin'
      ) {
        this.currentSelection = {
          ...this.currentSelection,
          normalizedAddress: resolvedLabel
        };
        this.renderCurrentResult();
      }
    } catch {
      // The fallback coordinate label is already visible in the UI.
    }
  }

  private setSelection(selection: PointSelection): void {
    this.currentSelection = selection;
    this.reverseLookupToken += 1;
    this.hideCandidates();

    this.elements.searchStatus.textContent =
      selection.resolutionMethod === 'geocoded'
        ? 'Adresse übernommen. Ergebnis wurde aktualisiert.'
        : 'Manueller Pin übernommen. Ergebnis wurde aktualisiert.';

    if (!this.selectionMarker) {
      this.selectionMarker = L.marker([selection.lat, selection.lon], {
        draggable: true,
        icon: createPinIcon('user')
      }).addTo(this.map);

      this.selectionMarker.on('dragend', () => {
        const point = this.selectionMarker?.getLatLng();

        if (!point) {
          return;
        }

        void this.setManualSelection(point.lat, point.lng, 'Pin verschoben');
      });
    } else {
      this.selectionMarker.setLatLng([selection.lat, selection.lon]);
    }

    this.map.panTo([selection.lat, selection.lon], {
      animate: true,
      duration: 0.4
    });

    this.renderCurrentResult();
  }

  private buildResult(): CheckResult | null {
    if (!this.currentSelection) {
      return null;
    }

    const school = this.selectedSchool;
    const district = this.selectedDistrict;
    const inside = pointInFeature(
      [this.currentSelection.lon, this.currentSelection.lat],
      district
    );

    return {
      ...this.currentSelection,
      schoolId: school.id,
      schoolName: school.name,
      districtId: district.properties.districtId,
      inside,
      sourceUrl: district.properties.sourceUrl,
      sourceVersion: district.properties.sourceVersion
    };
  }

  private renderCurrentResult(): void {
    const result = this.buildResult();

    if (!result) {
      this.elements.resultPanel.className = 'result-panel empty-state';
      this.elements.resultPanel.textContent =
        'Suche eine Adresse oder setze einen Pin in der Karte.';
      this.elements.resultJson.textContent = '';
      return;
    }

    const district = this.selectedDistrict;
    const statusClass = result.inside ? 'status status--inside' : 'status status--outside';
    const statusLabel = result.inside ? 'Innerhalb von SO1' : 'Außerhalb von SO1';
    const resolutionLabel =
      result.resolutionMethod === 'geocoded' ? 'Adresssuche' : 'manueller Pin';

    this.elements.resultPanel.className = 'result-panel';
    this.elements.resultPanel.innerHTML = `
      <div class="${statusClass}">${statusLabel}</div>
      <dl class="facts">
        <div>
          <dt>Adresse / Punkt</dt>
          <dd>${result.normalizedAddress}</dd>
        </div>
        <div>
          <dt>Gewählte Schule</dt>
          <dd>${result.schoolName}</dd>
        </div>
        <div>
          <dt>Koordinaten</dt>
          <dd>${formatCoordinate(result.lat)}, ${formatCoordinate(result.lon)}</dd>
        </div>
        <div>
          <dt>Ermittelt über</dt>
          <dd>${resolutionLabel}</dd>
        </div>
        <div>
          <dt>Polygon-Version</dt>
          <dd>${result.sourceVersion}</dd>
        </div>
      </dl>
      <p class="source-note">
        <a href="${OFFICIAL_SO1_MAP_URL}" target="_blank" rel="noreferrer">Offizielle SO1-Karte öffnen</a>
        <span> | </span>
        <a href="${district.properties.sourceUrl}" target="_blank" rel="noreferrer">Quelle ansehen</a>
      </p>
    `;

    this.elements.resultJson.textContent = JSON.stringify(result, null, 2);
    this.selectionMarker?.bindPopup(statusLabel).openPopup();
  }

  private clearSelection(): void {
    this.currentSelection = undefined;
    this.reverseLookupToken += 1;
    this.hideCandidates();
    this.elements.addressInput.value = '';

    if (this.selectionMarker) {
      this.selectionMarker.remove();
      this.selectionMarker = undefined;
    }

    this.renderSearchHint();
    this.renderCurrentResult();
  }
}

async function bootstrap(): Promise<void> {
  const app = new SchulbezirkApp();

  try {
    await app.init();
  } catch (error) {
    const fallback = document.querySelector('#result-panel');
    const message =
      error instanceof Error ? error.message : 'Unbekannter Initialisierungsfehler';

    if (fallback instanceof HTMLDivElement) {
      fallback.className = 'result-panel empty-state';
      fallback.textContent = `Die App konnte nicht geladen werden: ${message}`;
    }
  }
}

void bootstrap();
